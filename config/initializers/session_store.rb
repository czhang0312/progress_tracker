# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store,
  key: "_progress_tracker_session",
  same_site: :none, # Allow cross-origin requests
  secure: Rails.env.production?, # Secure cookies in production
  path: "/"
