<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5aee4f1c-d457-47f1-ad53-7da6ceacec7b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env` to your Gemini API key
3. Run the app:
   `npm run dev`

## 🚀 Deployment (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Configure **Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `APP_URL`: The production URL of your app.
3. The build command is `npm run build` and the output directory is `dist`.

## ✨ Key Features
- 🔍 **DermCheck AI (Hybrid)**: On-device skin screening with empathetic AI interpretation.
- 🔬 **Scan Explainer**: Decode radiology reports and medical images (X-rays, CTs).
- 🥗 **Nutrition Scanner**: Identify Indian foods and decode nutrition labels with goal alignment.
- 💊 **Medicine Cabinet**: Track expiry dates and manage your medications with offline persistence.
- 🆘 **Emergency SOS**: Quick access to nearby healthcare with offline location support.
- 🌐 **Multi-lingual**: Full support for English, Hindi, Kannada, Telugu, Chinese, and Japanese.

## 🚀 Specialized Hybrid AI
PocketHealth AI uses a unique **Hybrid AI Architecture**:
1. **On-Device specialized models (TFJS)**: For rapid, private screening that works offline.
2. **Cloud-based LLMs (Gemini Flash)**: For high-empathy interpretation and complex medical reasoning.

## 🏠 Offline-First Capabilities
- **PWA Integration**: Installable as a mobile app.
- **Offline Persistence**: Uses Firestore offline caching for all your medical data.
- **Offline Screening**: The DermCheck neural network runs locally in the browser, providing utility even in remote areas.
