# Hattrick Organizer for macOS (React Native prototype)

This React Native for macOS prototype currently implements three screens:

- **Plantilla** opens an `.hrf` file with the native macOS file picker (or accepts pasted text) and reads the team name, first-team players, and player skills.
- **Alineación** supports five formations, player assignment to exact Hattrick role groups, direct player swaps between positions, position-valid individual player behaviours (normal, offensive, defensive, towards middle, and towards wing), and match tactic selection, including Creative Play and Long Shots. “Calcular mejor once” also optimizes those behaviours against the selected sector objective. With seven opponent ratings available, it compares all 35 formation and team-tactic combinations, optimizes a lineup for each, and lets the user apply the top recommendations. “Calcular mejor once” starts with a one-to-one player assignment and refines it against the sum of seven estimated team-sector ratings, or against opponent sector matchups when all seven opponent ratings are entered. The matchup heuristic weights midfield three times and the six attack/defence comparisons once; it is a lineup aid, not a match-outcome prediction. No player is selected twice and slots stay empty when the imported squad has fewer than eleven players. The screen displays the seven estimates for the current draft lineup and up to three beneficial swaps from the bench.
- **Team Analyzer** compares the current lineup's seven ratings against a manually entered opponent profile or an imported opponent `.hrf`. For an imported roster it estimates and displays the opponent's lineup and sector ratings in the selected formation and tactic; individual manual values can override those estimates and display in the matchup comparison. The rival profile persists locally. Historical match download and opponent selection from the original Team Analyzer are not ported yet. It also calculates squad skill, form, stamina, experience, and loyalty averages, and ranks three player profiles for each role group.
- Match spirit, confidence, coach modifier, attitude, venue, and the imported roster, draft lineup, formation, team tactic, match weather, and individual player behaviours are saved in the app's macOS Application Support folder and restored at launch.

The estimates port the original `RatingPredictionModel` contribution factors for all five player behaviours, and include form, loyalty, experience, stamina, central-sector overcrowding penalties, and the known sector-rating multipliers for Attack in the Middle, Attack on Wings, Counter-attacks, Creative Play, and Long Shots. Team-sector estimates apply the editable team spirit, confidence, coach modifier, attitude, and venue; they default to HO's standard lineup values until the user enters match-specific data. Sector ratings still omit specialty-event effects and opponent-specific match odds. Player weather factors for Technical, Quick, and Powerful specialties are included, and Pressing ratings account for its extra stamina loss averaged across the 90-minute rating calculation. For non-normal tactics, the screen separately estimates HO's tactic level: Passing for Attack in the Middle/Attack on Wings, defensive-line skills and form for Counter-attacks, defending, form, experience, loyalty, stamina, and Powerful specialty for Pressing, passing, form, experience, and Unpredictable specialty for Creative Play, and scoring, set pieces, and loyalty for Long Shots. Pressing uses the selected weather. These estimates support lineup comparisons, not a full match prediction. The rest of the Java domain model, substitutions, and CHPP sync have not been ported or connected yet. Tactical choices update the saved draft and relevant estimates but do not write a Hattrick match order.

## Local setup

The app targets React Native 0.76.9 with `react-native-macos` 0.76.12. It requires Xcode, Node.js, and CocoaPods. From this directory:

```sh
npm install
npm run macos
```

Use Node 20.19 or newer for the Metro toolchain. The macOS native project is in `macos/`.
