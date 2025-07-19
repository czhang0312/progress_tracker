Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Get allowed origins from environment variable or use defaults
    allowed_origins = ENV['ALLOWED_ORIGINS']&.split(',') || [
      "http://localhost:3000",
      "https://progress-tracker-gkjy.onrender.com"
    ]
    
    origins *allowed_origins

    resource "*",
      headers: :any,
      methods: [ :get, :post, :patch, :put, :delete, :options, :head ],
      credentials: true,
      expose: ['Set-Cookie'] # Expose Set-Cookie header for cross-origin requests
  end
end
