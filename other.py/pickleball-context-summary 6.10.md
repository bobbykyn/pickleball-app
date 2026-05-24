# Pickleball App - Complete Project Context

## 🎾 Project Overview
- **Live URL:** https://pickleball-app-1.vercel.app/
- **GitHub:** https://github.com/bobbykyn/pickleball-app
- **Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase, Resend
- **Purpose:** Session booking app for Hong Kong pickleball group

## 🗂️ Database Structure (Supabase)
- **Tables:** sessions, rsvps, profiles
- **RLS:** All disabled (working fine)
- **Service Key:** Required for API to bypass RLS and fetch all users

## ✅ Working Features
1. **Authentication:** Email/password + Google OAuth
2. **Session Management:** Create, edit, delete sessions
3. **RSVP System:** Join/Maybe/Next Time buttons
4. **Cost Calculation:** Auto-calculates peak/off-peak rates for Megabox
5. **Dark Mode:** Default dark, toggleable
6. **Calendar View:** Desktop has sidebar, mobile has swipeable month view
7. **Profile Settings:** Users can set display name and phone
8. **History:** View past games
9. **Time Restrictions:** Can't create sessions in the past
10. **Admin Powers:** bobbykyn@gmail.com can delete any session

## 📱 Mobile/PWA Features
- Responsive design (calendar hidden on mobile, shown as swipeable banner)
- PWA ready with manifest.json
- Add to home screen capability on iOS/Android
- Settings moved to top-right on mobile

## 📧 Email Notifications (Partially Working)
- **Setup:** Resend API integrated
- **Issue:** Free tier only sends to account owner
- **Solution:** Need custom domain OR add users as Resend teammates
- **Files:** `/app/api/send-session-email/route.ts`

## 🔧 Key Components

### Core Files
- `app/page.tsx` - Main app layout
- `components/SessionCard.tsx` - Display sessions
- `components/CreateSessionModal.tsx` - Create sessions (HK timezone: +08:00)
- `components/EditSessionModal.tsx` - Edit sessions
- `components/ProfileModal.tsx` - Edit user profile
- `components/Sidebar.tsx` - Settings sidebar
- `components/CalendarView.tsx` - Desktop calendar
- `components/MobileCalendarSwiper.tsx` - Mobile swipeable calendar
- `components/HistoryModal.tsx` - View past games

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://ycwdncjrnamzwwfxnkug.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... (service role key)
RESEND_API_KEY=re_...
```

## 🐛 Known Issues
1. **Email notifications:** Only sending to account owner (Resend free tier limitation)
2. **Google profile pictures:** Not displaying (needs Supabase auth config)

## 🚀 Deployment
- Hosted on Vercel
- Environment variables must be added to Vercel dashboard
- Deploy with: `vercel --prod` or push to GitHub

## 📝 Next Session Plans
1. Fix email notifications (get custom domain for Resend)
2. Implement Google profile pictures
3. Add push notifications
4. Improve PWA features
5. Add recurring sessions
6. WhatsApp integration

## 🎯 Quick Start for New Developer
1. Clone repo
2. Install: `npm install`
3. Add `.env.local` with above variables
4. Run: `npm run dev`
5. For emails: Add teammates in Resend or get custom domain

## ⚠️ Important Notes
- App uses Hong Kong timezone (UTC+8)
- No complex timezone handling - just append `:00+08:00` to datetime
- Dark mode is default
- Mobile-first design considerations
- Admin email: bobbykyn@gmail.com

## 📱 Testing Accounts
- Admin: bobbykyn@gmail.com
- Test users in profiles table (need actual signups for emails to work)

## 🔑 Key Learnings from Development
- Keep timezone handling simple for single-location apps
- Supabase service key needed for API to read all users
- Resend free tier has email recipient limitations
- Mobile UX needs different layout than desktop
- PWA setup is straightforward with Next.js

## 📂 File Structure
```
/app
  /api
    /send-session-email
      route.ts
  page.tsx
  layout.tsx
/components
  SessionCard.tsx
  CreateSessionModal.tsx
  EditSessionModal.tsx
  ProfileModal.tsx
  Sidebar.tsx
  CalendarView.tsx
  MobileCalendarSwiper.tsx
  HistoryModal.tsx
/lib
  supabase.ts
/public
  manifest.json
  icon-192.png
/types
  index.ts
```

This app is functional and deployed. Main remaining issue is email notifications due to Resend free tier limitations.