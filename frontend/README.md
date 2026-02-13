# Douyin Frontend - Authentication System

This is the frontend implementation for the Douyin video platform, featuring a complete authentication system with login and registration functionality.

## Features

### Authentication System
- **Login**: Users can log in with username and password
- **Registration**: New users can register with username, password, and optional nickname
- **Token Management**: JWT token stored in localStorage with automatic verification
- **Protected Routes**: Routes are protected and redirect to login when not authenticated
- **Form Validation**: Client-side validation for username, password, and nickname
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during API calls

### UI/UX
- **Dark Mode**: Professional dark theme with glassmorphism effects
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Accessibility**: Proper focus states, keyboard navigation, and ARIA labels
- **Animations**: Smooth transitions and ambient effects
- **Design System**: Follows the Douyin brand guidelines with rose and cyan accents

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── auth.js          # Authentication API calls
│   │   └── client.js        # Base fetch wrapper
│   ├── components/
│   │   └── Auth/
│   │       ├── LoginPage.jsx
│   │       └── AuthForm.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication context
│   ├── utils/
│   │   └── validation.js    # Form validation
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   └── styles.css           # Global styles with Tailwind
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies
```

## API Endpoints

The frontend integrates with the following backend endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info (requires token)

## Installation & Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Configuration

### Environment Variables
The frontend uses the backend API at `http://localhost:18081` by default. To change this, update the API client in `src/api/client.js`.

### Tailwind CSS
The project uses Tailwind CSS v3 with custom configuration:
- Custom colors: primary (rose), secondary, cta (blue)
- Custom fonts: Inter for body, Sora for headings
- Custom animations: float-pulse, glow

## Testing

The authentication system has been tested with the backend API:

1. **Registration**: ✓ Successfully creates new users
2. **Login**: ✓ Successfully authenticates users
3. **User Info**: ✓ Successfully retrieves user data with token
4. **Token Verification**: ✓ Automatically verifies token on app load
5. **Protected Routes**: ✓ Redirects to login when not authenticated

## Design System

Based on the Douyin brand and design system recommendations:

### Colors
- Primary: `#E11D48` (Rose)
- Secondary: `#FB7185` (Light Rose)
- CTA: `#2563EB` (Blue)
- Background: `#000000` (Dark)
- Text: `#FFFFFF` (White)

### Typography
- Headings: Sora (Bold, Modern)
- Body: Inter (Clean, Readable)

### Effects
- Glass morphism cards with backdrop blur
- Ambient floating effects
- Smooth transitions (200-300ms)
- Neon glow effects on focus

## Next Steps

Once authentication is working, you can extend the frontend with:

1. **Video Feed**: Display videos with infinite scroll
2. **Video Upload**: Implement file upload with chunking
3. **User Profile**: Edit profile, view stats
4. **Social Features**: Like, comment, share videos
5. **Recommendations**: Integrate with the recommendation system

## Troubleshooting

### Build Errors
- **Tailwind CSS errors**: Ensure Tailwind CSS v3 is installed
- **Port conflicts**: Change the port in `npm run dev -- --port <port>`
- **CORS issues**: Ensure backend is running and CORS is configured

### Authentication Issues
- **Token not stored**: Check localStorage permissions
- **API errors**: Verify backend is running on port 18081
- **Validation errors**: Check form validation rules

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## License

This project is part of the Douyin video platform implementation.