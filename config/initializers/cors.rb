Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:3000",
            "https://progress-tracker-navy.vercel.app",
            /https:\/\/progress-tracker-.*\.vercel\.app$/

    resource "*",
      headers: :any,
      methods: [ :get, :post, :patch, :put, :delete, :options, :head ],
      credentials: true,
      expose: [ "Authorization" ]
  end
end
