# 🪑 Houding Monitor

Een AI-powered posture detection app die je helpt om rechtop te zitten tijdens het werken. Gebruikt ml5.js bodyPose (MoveNet) om je houding realtime te monitoren.

## 🎯 Features

- **Real-time Pose Detection**: Gebruikt ml5.js bodyPose (MoveNet model)
- **Smart Posture Analysis**: 
  - Detecteert onderuit zakken
  - Controleert hoofd positie (te ver voorover?)
  - Meet torso lengte (in elkaar gedoken?)
  - Vergelijkt met goede referentie houding
- **Visual Feedback**: 
  - Groene/rode status badge
  - Skeleton overlay op je lichaam
  - Live status panel
- **Alerts**: 
  - Rode banner bij slechte houding
  - Vibratie op mobiele apparaten
  - Cooldown om spam te voorkomen
- **Privacy**: Alles werkt lokaal in je browser, geen data naar server

## 🚀 Live Demo

**Probeer het online: [https://michelschep.github.io/p5js-posture-monitor/](https://michelschep.github.io/p5js-posture-monitor/)**

## 💡 Hoe te gebruiken

1. Sta webcam toegang toe
2. Zorg dat je hoofd, schouders en heupen zichtbaar zijn
3. Begin met rechtop zitten (dit wordt de referentie)
4. De app monitort je houding en waarschuwt bij onderuit zakken

## 🎨 Wat wordt gedetecteerd?

De app checkt op:
- **Hoofd positie**: Te ver naar voren of omlaag
- **Schouder hoogte**: Onderuit zakken
- **Torso lengte**: In elkaar gedoken zitten
- **Relatieve verandering**: Vergelijking met goede houding

## 🛠️ Technologie

- [p5.js](https://p5js.org/) - Creative coding
- [ml5.js](https://ml5js.org/) - Machine learning library
- MoveNet - Pose detection model
- HTML5 Canvas & WebRTC

## 📱 Browser Compatibiliteit

- Chrome/Edge (aanbevolen)
- Firefox
- Safari (iOS 11+)

**Note**: Werkt alleen over HTTPS of localhost

## ⚙️ Algoritme Details

1. **Reference Point**: Bij start wordt goede houding vastgelegd
2. **Multi-check System**:
   - Neck angle: `shoulderY - noseY > 60px`
   - Shoulder drop: `< 40px` ten opzichte van referentie
   - Torso length: `hipY - shoulderY > 120px`
   - Nose drop: `< 30px` gecombineerd met shoulder drop
3. **Debouncing**: 30 frames consistent voor status change
4. **Alert Cooldown**: 5 seconden tussen waarschuwingen

## 💪 Tips voor Goede Houding

- Rug recht tegen de stoelleuning
- Schouders ontspannen naar achteren
- Hoofd recht boven je schouders
- Voeten plat op de grond
- Screen op ooghoogte

## 📝 Licentie

MIT License - Vrij te gebruiken

## 🏥 Gezondheid

Deze app is bedoeld als hulpmiddel. Voor medisch advies over houding en rugpijn, raadpleeg een professional.
