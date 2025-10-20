mod mqtt;

use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .manage(Arc::new(Mutex::new(mqtt::MqttClientState::new())))
    .invoke_handler(tauri::generate_handler![
      mqtt::mqtt_connect,
      mqtt::mqtt_disconnect,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
