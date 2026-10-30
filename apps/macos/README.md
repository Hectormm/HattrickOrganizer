# Hattrick Organizer for macOS (React Native prototype)

This React Native for macOS prototype currently implements three screens:

- **Plantilla** opens an `.hrf` file with the native macOS file picker (or accepts pasted text) and reads the team name, first-team players, and player skills.
- **Alineación** supports five formations, player assignment to exact Hattrick role groups, and match tactic selection. “Calcular mejor once” uses a maximum-weight one-to-one assignment across the eleven slots, so no player is selected twice and unfilled slots stay empty when the imported squad has fewer players.
- **Team Analyzer** calculates squad skill averages and ranks three player profiles for goalkeeper, central defender, fullback, winger, inner midfielder, and forward roles.
- The imported roster, draft lineup, formation, and tactic are saved in the app's macOS Application Support folder and restored at launch.

The position estimates port the original `RatingPredictionModel` factors for normal player behaviour and include form, loyalty, experience, and stamina. The lineup optimizer maximizes the sum of these individual estimates for the selected formation; it is a useful draft, not a match result predictor. The estimates do not calculate collective sector ratings, weather effects, non-normal player behaviour, or opponent-specific match odds. The rest of the Java domain model, match orders, substitutions, and CHPP sync have not been ported or connected yet. Tactical choices currently update the saved draft in the interface and do not write a Hattrick match order.

## Local setup

The app targets React Native 0.76.9 with `react-native-macos` 0.76.12. It requires Xcode, Node.js, and CocoaPods. From this directory:

```sh
npm install
npm run macos
```

Use Node 20.19 or newer for the Metro toolchain. The macOS native project is in `macos/`.
