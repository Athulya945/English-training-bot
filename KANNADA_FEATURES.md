# Kannada Language Support for English Training Bot

## Overview

The English Training Bot now supports Kannada language, allowing Kannada speakers to learn English through bilingual conversations. Users can speak in Kannada and receive responses in both Kannada and English, making the learning process more accessible and comfortable.

## Features

### 🗣️ Bilingual Conversations
- **Kannada Input**: Users can speak or type in Kannada
- **Dual Response**: Bot responds in both Kannada and English
- **Format**: 
  ```
  ಕನ್ನಡ: [Kannada response for comfort and understanding]
  English: [English response for learning and practice]
  ```

### 🎤 Voice Support
- **Kannada Speech Recognition**: Supports Kannada voice input (`kn-IN`)
- **Bilingual TTS**: Text-to-speech in both Kannada and English
- **Combined Audio**: Responses are synthesized in both languages sequentially

### 📚 Learning Scenarios
- **ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆ** (Kannada-English Conversation)
- **ಉಚ್ಚಾರಣೆ ಅಭ್ಯಾಸ** (Pronunciation Practice)
- **ವ್ಯಾಕರಣ ಕಲಿಕೆ** (Grammar Learning)
- **ಪದಕೋಶ ನಿರ್ಮಾಣ** (Vocabulary Building)

### 🌐 Language Selection
- Easy language switching between English and Kannada modes
- Context-aware UI that adapts to the selected language
- Bilingual placeholders and instructions

## API Endpoints

### Text Chat
- **English**: `/api/chat`
- **Kannada**: `/api/kannada-chat`

### Voice Chat
- **English**: `/api/voicechat`
- **Kannada**: `/api/kannada-voicechat`

## Technical Implementation

### Speech Recognition
```javascript
// Kannada speech recognition
recognition.lang = "kn-IN";

// English speech recognition
recognition.lang = "en-US";
```

### Text-to-Speech
```javascript
// Kannada TTS
const kannadaAudio = await synthesizeSpeech(kannadaText, "kn-IN");

// English TTS
const englishAudio = await synthesizeSpeech(englishText, "en-IN");
```

### Bilingual Response Processing
The system automatically:
1. Detects the input language (Kannada or English)
2. Generates bilingual responses
3. Synthesizes speech in both languages
4. Combines audio for seamless playback

## User Experience

### For Kannada Speakers
- **Comfort**: Speak in your native language
- **Learning**: Get English translations and explanations
- **Practice**: Improve English through bilingual conversations
- **Confidence**: Build confidence with gradual English exposure

### Learning Benefits
- **Reduced Anxiety**: Native language support reduces learning anxiety
- **Better Understanding**: Concepts explained in familiar language
- **Cultural Context**: Learning adapted to Indian/Karnataka context
- **Progressive Learning**: Gradual transition from Kannada to English

## Setup Requirements

### Environment Variables
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
GOOGLE_TTS_API_KEY=your_google_tts_key
PINECONE_API_KEY=your_pinecone_key
```

### Google TTS Voices
- **Kannada**: `kn-IN-Standard-A`
- **English (India)**: `en-IN-Standard-A`
- **English (US)**: `en-US-Standard-C`

## Usage Examples

### Starting a Conversation
1. Select "Kannada" from the language selector
2. Click on "ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆ"
3. Speak in Kannada: "ನಮಸ್ಕಾರ, ನಾನು ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ಬಯಸುತ್ತೇನೆ"

### Expected Response
```
ಕನ್ನಡ: ನಮಸ್ಕಾರ! ನಿಮಗೆ ಇಂಗ್ಲಿಷ್ ಕಲಿಸಲು ನನಗೆ ಸಂತೋಷವಾಗುತ್ತದೆ. ನಾವು ಒಟ್ಟಿಗೆ ಕಲಿಯೋಣ.

English: Hello! I'm happy to teach you English. Let's learn together.
```

## Future Enhancements

- [ ] Support for more Indian languages (Hindi, Tamil, Telugu)
- [ ] Regional accent training
- [ ] Cultural context scenarios
- [ ] Progress tracking in both languages
- [ ] Offline mode with pre-downloaded content

## Contributing

To add support for additional languages:
1. Create new API routes following the pattern `/api/{language}-chat`
2. Add language options to `LanguageSelector.tsx`
3. Update speech recognition and TTS configurations
4. Add language-specific scenarios to `Scenarios.json`

## Support

For technical support or feature requests related to Kannada language support, please create an issue in the project repository. 