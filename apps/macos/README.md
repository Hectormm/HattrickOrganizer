# Hattrick Organizer for macOS (React Native prototype)

This React Native for macOS prototype currently implements three screens:

- **Plantilla** opens an `.hrf` file with the native macOS file picker (or accepts pasted text) and reads the team name, first-team players, and player skills.
- **Alineación** supports five formations, player assignment to positions, and match tactic selection. A player can only occupy one position at a time.
- **Team Analyzer** calculates squad averages for keeper, defending, playmaking, passing, winger, and scoring skills from the imported roster.
- The imported roster, draft lineup, formation, and tactic are saved in the app's macOS Application Support folder and restored at launch.

The HRF reader is a small TypeScript parser for the current UI. The original Java domain model, lineup ratings, match orders, substitutions, and CHPP sync have not been ported or connected yet. Tactical choices currently update the saved draft in the interface and do not write a Hattrick match order.

## Local setup

The app targets React Native 0.76.9 with `react-native-macos` 0.76.12. It requires Xcode, Node.js, and CocoaPods. From this directory:

```sh
npm install
npm run macos
```

Use Node 20.19 or newer for the Metro toolchain. The macOS native project is in `macos/`.
