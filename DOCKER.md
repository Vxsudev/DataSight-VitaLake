# DataSight-VitaLake Docker Setup

## Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Build and start all services (app + PostgreSQL + pgAdmin)
docker-compose up --build

# Access the application
open http://localhost:3000

# Access pgAdmin (optional)
open http://localhost:5050
```

### Option 2: Docker Build Only
```bash
# Build the Docker image
docker build -t datasight-vitalake .

# Run the container
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data:ro \
  datasight-vitalake
```

## Configuration

### Environment Variables
Copy the example environment file:
```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your database configuration.

### Database Connections
The app uses `./data/connections.json` for database configurations. Mount this file in the container or configure via environment variables.

## Production Deployment

### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-west-2.amazonaws.com
docker build -t datasight-vitalake .
docker tag datasight-vitalake:latest <account>.dkr.ecr.us-west-2.amazonaws.com/datasight-vitalake:latest
docker push <account>.dkr.ecr.us-west-2.amazonaws.com/datasight-vitalake:latest
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: datasight-vitalake
spec:
  replicas: 2
  selector:
    matchLabels:
      app: datasight-vitalake
  template:
    metadata:
      labels:
        app: datasight-vitalake
    spec:
      containers:
      - name: datasight-vitalake
        image: your-registry/datasight-vitalake:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: database-config
          mountPath: /app/data
          readOnly: true
      volumes:
      - name: database-config
        configMap:
          name: datasight-db-config
```

## Development with Docker

### Hot Reload Development
```bash
# For development with hot reload
docker run -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  node:18-alpine \
  sh -c "cd /app && npm run dev"
```

### Debug Container
```bash
# Access running container shell
docker exec -it <container-id> sh

# View logs
docker logs <container-id> -f
```

## Security Considerations

1. **Secrets Management**: Use Docker secrets or environment variables for sensitive data
2. **Network Security**: Configure proper network policies in production
3. **User Permissions**: The container runs as non-root user (nextjs:nodejs)
4. **File Permissions**: Database config files are mounted read-only

## Performance Optimization

1. **Multi-stage Build**: Reduces final image size
2. **Node Alpine**: Smaller base image
3. **Output Standalone**: Optimized Next.js build for containers
4. **Layer Caching**: Efficient Docker layer caching for faster builds
