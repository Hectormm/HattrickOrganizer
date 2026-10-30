# Hattrick Organizer for macOS (React Native prototype)

This React Native for macOS prototype currently implements three screens:

- **Plantilla** opens an `.hrf` file with the native macOS file picker (or accepts pasted text) and reads the team name, first-team players, and player skills.
- **Alineación** supports five formations, player assignment to exact Hattrick role groups, and match tactic selection. “Calcular mejor once” starts with a one-to-one player assignment and refines it against the sum of seven estimated team-sector ratings; no player is selected twice and slots stay empty when the imported squad has fewer than eleven players. The screen displays the seven estimates for the current draft lineup.
- **Team Analyzer** calculates squad skill averages and ranks three player profiles for goalkeeper, central defender, fullback, winger, inner midfielder, and forward roles.
- The imported roster, draft lineup, formation, and tactic are saved in the app's macOS Application Support folder and restored at launch.

The estimates port the original `RatingPredictionModel` contribution factors for normal player behaviour, and include form, loyalty, experience, stamina, central-sector overcrowding penalties, and the known sector-rating multipliers for Attack in the Middle, Attack on Wings, and Counter-attacks. Team-sector estimates assume neutral team factors because the HRF import does not yet provide all required match context. Sector ratings omit coach style, team spirit, confidence, venue, weather, specialty effects, player orders, opponent-specific match odds, and Pressing's extra stamina loss. When Pressing is selected, the screen separately estimates HO's tactic level at minute 90 from the assigned field players' defending, form, experience, loyalty, stamina, and Powerful specialty, assuming neutral weather. These estimates support lineup comparisons, not a full match prediction. The rest of the Java domain model, substitutions, and CHPP sync have not been ported or connected yet. Tactical choices update the saved draft and relevant estimates but do not write a Hattrick match order.

## Local setup

The app targets React Native 0.76.9 with `react-native-macos` 0.76.12. It requires Xcode, Node.js, and CocoaPods. From this directory:

```sh
npm install
npm run macos
```

Use Node 20.19 or newer for the Metro toolchain. The macOS native project is in `macos/`.
