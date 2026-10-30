# Hattrick Organizer for macOS (React Native prototype)

Initial UI shell for the planned migration. It provides navigation for Squad, Lineup, and Team Analyzer; domain data and the existing Java calculation engine are not connected yet.

## Local setup

This scaffold targets React Native 0.76 with the matching `react-native-macos` 0.76 line. Install Xcode (not only Command Line Tools), Node.js, and CocoaPods, then generate the macOS native project using the React Native macOS getting-started instructions. After the native project exists, run `npm install` and `npm run macos` from this directory.

The prototype intentionally contains no CHPP credentials or data migration. The next implementation step is to define a typed bridge contract to the existing Java lineup/rating engine and add read-only sample data.
