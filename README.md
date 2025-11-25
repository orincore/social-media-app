# Social Media App

A modern, production-grade social media platform built with Next.js 14, TypeScript, Supabase, and Tailwind CSS. Features Google OAuth authentication, real-time updates, media uploads, and a responsive design.

## 🚀 Features

- **Authentication**: Google OAuth with NextAuth.js
- **User Onboarding**: Complete profile setup flow
- **Real-time Feed**: Post creation, likes, comments, reposts
- **Media Upload**: Image and video support with compression
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Security**: Input validation, rate limiting, XSS protection
- **Performance**: Server components, caching with Redis
- **Type Safety**: Full TypeScript implementation

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage, Real-time)
- **Caching**: Upstash Redis
- **Authentication**: NextAuth.js with Google OAuth
- **Validation**: Zod schemas
- **UI Components**: Radix UI primitives
- **State Management**: React Query (TanStack Query)

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- A Supabase project
- Google OAuth credentials
- Upstash Redis instance (optional, for caching)

## ⚙️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd social-media-app
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Upstash Redis Configuration (Optional)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Run the database migrations (SQL scripts in `/supabase/migrations/`)
3. Set up Row Level Security (RLS) policies
4. Configure Google OAuth in Supabase Auth settings
5. Create storage buckets for media uploads

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main application pages
│   ├── api/               # API routes
│   └── onboarding/        # User onboarding flow
├── components/            # React components
│   ├── ui/                # Base UI components
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── feed/              # Feed-related components
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client configuration
│   ├── redis/             # Redis client configuration
│   ├── auth/              # Authentication configuration
│   ├── utils/             # Utility functions
│   └── validations/       # Zod validation schemas
└── types/                 # TypeScript type definitions
```

## 🔒 Security Features

- **Input Validation**: All user inputs validated with Zod schemas
- **SQL Injection Prevention**: Parameterized queries with Supabase
- **XSS Protection**: Content sanitization and CSP headers
- **CSRF Protection**: Built-in NextAuth.js protection
- **Rate Limiting**: API endpoint rate limiting with Redis
- **Authentication**: Secure JWT tokens with httpOnly cookies
- **Authorization**: Row Level Security (RLS) policies in Supabase

## 🚀 Performance Optimizations

- **Server Components**: Reduced client-side JavaScript
- **Image Optimization**: Next.js Image component with lazy loading
- **Caching**: Redis caching for frequently accessed data
- **Code Splitting**: Dynamic imports for heavy components
- **Bundle Optimization**: Tree shaking and minification

## 📱 Responsive Design

- Mobile-first approach with Tailwind CSS
- Responsive navigation with mobile menu
- Touch-friendly interactions
- Optimized for all screen sizes

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [PROGRESS.md](PROGRESS.md) file for current status
2. Review the troubleshooting section below
3. Open an issue on GitHub

## 🔧 Troubleshooting

### Common Issues

1. **Authentication not working**: Check Google OAuth credentials and redirect URIs
2. **Database errors**: Verify Supabase connection and RLS policies
3. **Build errors**: Ensure all environment variables are set
4. **TypeScript errors**: Run `npm run type-check` to identify issues

### Development Tips

- Use `npm run dev` for development with hot reloading
- Check browser console for client-side errors
- Monitor Supabase logs for database issues
- Use React DevTools for component debugging

---

**Built with ❤️ using modern web technologies**
