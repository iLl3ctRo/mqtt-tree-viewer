use anyhow::{anyhow, Result};
use rumqttc::{self, AsyncClient, Event, EventLoop, MqttOptions, Packet, QoS};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionProfile {
    pub id: String,
    pub name: String,
    pub url: String,
    pub client_id: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub keepalive: Option<u64>,
    pub clean_start: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionSpec {
    pub filter: String,
    pub qos: u8,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttMessage {
    pub topic: String,
    pub payload: Vec<u8>,
    pub qos: u8,
    pub retained: bool,
    pub dup: bool,
}

pub struct MqttClientState {
    client: Option<AsyncClient>,
    event_loop: Option<EventLoop>,
}

impl MqttClientState {
    pub fn new() -> Self {
        Self {
            client: None,
            event_loop: None,
        }
    }
}

pub type MqttState = Arc<Mutex<MqttClientState>>;

fn parse_mqtt_url(url: &str) -> Result<(String, u16, bool)> {
    let url = url.trim();

    // Handle mqtt:// and mqtts:// protocols
    let (host_port, use_tls) = if let Some(stripped) = url.strip_prefix("mqtts://") {
        (stripped, true)
    } else if let Some(stripped) = url.strip_prefix("mqtt://") {
        (stripped, false)
    } else {
        // Default to non-TLS if no protocol specified
        (url, false)
    };

    // Split host and port
    let parts: Vec<&str> = host_port.split(':').collect();

    let (host, port) = match parts.as_slice() {
        [h] => (h.to_string(), if use_tls { 8883 } else { 1883 }),
        [h, p] => {
            let port = p.parse::<u16>()
                .map_err(|_| anyhow!("Invalid port number: {}", p))?;
            (h.to_string(), port)
        }
        _ => return Err(anyhow!("Invalid MQTT URL format")),
    };

    Ok((host, port, use_tls))
}

#[tauri::command]
pub async fn mqtt_connect(
    profile: ConnectionProfile,
    subscriptions: Vec<SubscriptionSpec>,
    state: tauri::State<'_, MqttState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    log::info!("Connecting to MQTT broker: {}", profile.url);

    let (host, port, use_tls) = parse_mqtt_url(&profile.url)
        .map_err(|e| format!("Failed to parse URL: {}", e))?;

    log::info!("Parsed connection: host={}, port={}, tls={}", host, port, use_tls);

    let client_id = profile
        .client_id
        .unwrap_or_else(|| format!("mqttui_{}", uuid::Uuid::new_v4().to_string()[..8].to_string()));

    let mut mqtt_options = MqttOptions::new(client_id, host, port);
    mqtt_options.set_keep_alive(std::time::Duration::from_secs(profile.keepalive.unwrap_or(60)));
    mqtt_options.set_clean_session(profile.clean_start.unwrap_or(true));

    if let Some(username) = profile.username {
        let password = profile.password.unwrap_or_default();
        mqtt_options.set_credentials(username, password);
    }

    if use_tls {
        // TODO: Add TLS configuration here
        log::warn!("TLS support not yet implemented, connecting without TLS");
    }

    let (client, mut event_loop) = AsyncClient::new(mqtt_options, 10);

    // Store client only (event_loop moves into spawned task)
    {
        let mut state = state.lock().await;
        state.client = Some(client.clone());
    }

    // Spawn task to handle events
    let app_handle_clone = app_handle.clone();
    tokio::spawn(async move {
        log::info!("MQTT event loop started");

        loop {
            match event_loop.poll().await {
                Ok(Event::Incoming(Packet::ConnAck(_))) => {
                    log::info!("MQTT connected successfully");
                    let _ = app_handle_clone.emit("mqtt://connected", ());
                }
                Ok(Event::Incoming(Packet::Publish(publish))) => {
                    let message = MqttMessage {
                        topic: publish.topic.to_string(),
                        payload: publish.payload.to_vec(),
                        qos: publish.qos as u8,
                        retained: publish.retain,
                        dup: publish.dup,
                    };
                    let _ = app_handle_clone.emit("mqtt://message", message);
                }
                Ok(Event::Incoming(Packet::SubAck(_))) => {
                    log::info!("Subscription acknowledged");
                }
                Ok(Event::Outgoing(_)) => {
                    // Ignore outgoing events for now
                }
                Err(e) => {
                    log::error!("MQTT connection error: {}", e);
                    let _ = app_handle_clone.emit("mqtt://error", format!("Connection error: {}", e));
                    break;
                }
                _ => {}
            }
        }

        log::info!("MQTT event loop ended");
    });

    // Subscribe to filters
    for sub in subscriptions {
        let qos = match sub.qos {
            0 => QoS::AtMostOnce,
            1 => QoS::AtLeastOnce,
            2 => QoS::ExactlyOnce,
            _ => QoS::AtMostOnce,
        };

        client
            .subscribe(&sub.filter, qos)
            .await
            .map_err(|e| format!("Subscription failed: {}", e))?;

        log::info!("Subscribed to: {} with QoS {:?}", sub.filter, qos);
    }

    Ok(())
}

#[tauri::command]
pub async fn mqtt_disconnect(state: tauri::State<'_, MqttState>) -> Result<(), String> {
    log::info!("Disconnecting from MQTT broker");

    let mut state = state.lock().await;

    if let Some(client) = &state.client {
        client
            .disconnect()
            .await
            .map_err(|e| format!("Disconnect failed: {}", e))?;
    }

    state.client = None;
    state.event_loop = None;

    Ok(())
}

// Helper module for UUID generation
mod uuid {
    use std::fmt;

    pub struct Uuid([u8; 16]);

    impl Uuid {
        pub fn new_v4() -> Self {
            let mut bytes = [0u8; 16];
            // Simple random bytes (in production, use proper UUID library)
            for i in 0..16 {
                bytes[i] = (std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos() as u8)
                    .wrapping_add(i as u8);
            }
            Self(bytes)
        }

        pub fn to_string(&self) -> String {
            format!(
                "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
                self.0[0], self.0[1], self.0[2], self.0[3],
                self.0[4], self.0[5],
                self.0[6], self.0[7],
                self.0[8], self.0[9],
                self.0[10], self.0[11], self.0[12], self.0[13], self.0[14], self.0[15]
            )
        }
    }

    impl fmt::Display for Uuid {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "{}", self.to_string())
        }
    }
}
