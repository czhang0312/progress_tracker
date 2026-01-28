Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000",
            "https://progresstracker-production-4b12.up.railway.app"

    resource "*",
      headers: :any,
      methods: [ :get, :post, :patch, :put, :delete, :options, :head ],
      credentials: true
  end
end
