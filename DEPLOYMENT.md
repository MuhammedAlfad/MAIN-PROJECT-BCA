# Deployment Guide

## Overview

This guide covers deploying your Trip Planner application to production.

## Prerequisites

- GitHub account (for code hosting)
- MongoDB Atlas account (for database)
- Vercel account (for frontend)
- Railway/Heroku/Render account (for backend)

## Part 1: MongoDB Atlas Setup (Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new project
4. Create a cluster (free tier available)
5. Create a database user:
   - Username: your_username
   - Password: strong_password
6. Get connection string:
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database password
7. Example: `mongodb+srv://user:password@cluster.mongodb.net/trip_planner?retryWrites=true&w=majority`

## Part 2: Backend Deployment (Railway)

### Using Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project
4. Connect your GitHub repo
5. Add MongoDB plugin
6. Add environment variables:
   ```
   MONGODB_URL=your_atlas_connection_string
   DATABASE_NAME=trip_planner
   SECRET_KEY=generate_strong_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```
7. Deploy!

### Using Heroku

1. Go to https://www.heroku.com
2. Sign up and create new app
3. Connect to GitHub repo
4. Add buildpack for Python
5. Set environment variables in "Config Vars"
6. Deploy branch

### Using Render

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Set runtime to Python 3.11
5. Set build command: `pip install -r requirements.txt`
6. Set start command: `gunicorn -w 4 -b 0.0.0.0:8000 main:app`
7. Add environment variables
8. Deploy!

### Environment Variables to Set

```
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/trip_planner
DATABASE_NAME=trip_planner
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Part 3: Frontend Deployment (Vercel)

### Using Vercel (Recommended)

1. Go to https://vercel.com
2. Sign up with GitHub
3. Import project
4. Select `frontend` folder as root
5. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```
6. Deploy!

### Using Netlify

1. Go to https://netlify.com
2. Connect GitHub repo
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Add environment variables
6. Deploy!

## Step-by-Step Deployment Checklist

### Backend

- [ ] Update `SECRET_KEY` in production (use strong random string)
- [ ] Set `ALLOWED_ORIGINS` to include frontend URL
- [ ] Update CORS settings in main.py
- [ ] Set `DEBUG=False` if using a debug variable
- [ ] Test all API endpoints in production
- [ ] Set up database backups
- [ ] Monitor logs and errors

### Frontend

- [ ] Update `NEXT_PUBLIC_API_URL` to production backend
- [ ] Test login flow
- [ ] Test create trip functionality
- [ ] Test place recommendations
- [ ] Test discover page
- [ ] Check console for errors
- [ ] Test responsive design
- [ ] Verify images load correctly

## Environment Variables

### Backend (Production)

```env
# Database
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/trip_planner
DATABASE_NAME=trip_planner

# Security
SECRET_KEY=your-very-secure-random-string-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional
DEBUG=false
LOG_LEVEL=info
```

### Frontend (Production)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Post-Deployment

### Testing

1. Register new account
2. Create a trip
3. Add places to itinerary
4. Make trip public
5. Discover own trip
6. Edit trip
7. Save changes

### Monitoring

- Check backend logs regularly
- Monitor database usage
- Set up error tracking (Sentry)
- Monitor application performance

### Maintenance

- Update dependencies regularly
- Backup database periodically
- Monitor server performance
- Keep Python/Node versions updated
- Review security logs

## Custom Domain Setup

### For Backend

If using Railway/Heroku:
1. Go to domain settings
2. Add custom domain
3. Update DNS records
4. Wait for SSL certificate

### For Frontend

If using Vercel:
1. Go to project settings
2. Add domain
3. Update DNS records at registrar
4. Vercel auto-generates SSL

## Database Backups

### MongoDB Atlas

1. Go to Deployment > Backup
2. Enable daily backups
3. Configure retention policy
4. Test restore process

### Manual Export

```bash
# Backup
mongodump --uri "mongodb+srv://user:password@cluster.mongodb.net/trip_planner" --out ./backup

# Restore
mongorestore --uri "mongodb+srv://user:password@cluster.mongodb.net" ./backup
```

## Scaling

### Database

- Upgrade MongoDB tier as needed
- Enable read replicas for high traffic
- Consider sharding for very large datasets

### Backend

- Use load balancer
- Deploy multiple instances
- Cache API responses
- Optimize database queries

### Frontend

- Enable CDN
- Optimize images
- Lazy load components
- Enable caching headers

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **HTTPS only** - Verify SSL certificates
3. **CORS properly** - Only allow your domain
4. **Rate limiting** - Prevent API abuse
5. **Input validation** - Validate all user inputs
6. **SQL/NoSQL injection** - Use parameterized queries
7. **Keep dependencies updated** - Regular security updates
8. **Monitor logs** - Watch for suspicious activity

## Troubleshooting Deployment

### Backend won't start

```bash
# Check logs
railway logs  # Railway
heroku logs --tail  # Heroku
render logs  # Render

# Common issues:
# - Wrong MongoDB connection string
# - Missing environment variables
# - Port not exposed
```

### Frontend not connecting to backend

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on backend
- Verify backend is running
- Check browser console for errors

### Database connection fails

- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions
- Verify network connectivity

## Performance Optimization

### Backend

```python
# Add caching
from functools import lru_cache

# Add pagination
# Add indexes to database

# Async operations where possible
async def get_trips():
    pass
```

### Frontend

```javascript
// Code splitting
const ItineraryEditor = dynamic(() => import('@/components/ItineraryEditor'), {
  loading: () => <p>Loading...</p>,
});

// Image optimization
<Image src={trip.cover_image} alt={trip.title} />

// Lazy loading
<IntersectionObserver>
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          npm run build
          # Deploy commands
```

## Contact & Support

For deployment issues:
- Check platform documentation
- Review error logs
- Ask in community forums
- Contact hosting provider support

Good luck with your deployment! 🚀
