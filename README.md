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

## ✨ Features
- **Scan Explainer**: Decode radiology reports and medical images.
- **Nutrition Scanner**: Identify Indian foods and decode nutrition labels.
- **Medicine Cabinet**: Track expiry dates and manage your medications.
- **Emergency SOS**: Quick access to nearby healthcare and emergency contacts.
- **Multi-lingual**: Support for English, Hindi, Kannada, and Telugu.
