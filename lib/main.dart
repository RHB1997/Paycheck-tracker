import 'package:flutter/material.dart';

import 'screens/paycheck_home_page.dart';

void main() {
  runApp(const PaycheckTrackerApp());
}

class PaycheckTrackerApp extends StatelessWidget {
  const PaycheckTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF286B5A),
      brightness: Brightness.light,
    );

    return MaterialApp(
      title: 'Paycheck Tracker',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: const Color(0xFFF6F7F5),
        cardTheme: const CardThemeData(elevation: 0, margin: EdgeInsets.zero),
      ),
      home: PaycheckHomePage(),
    );
  }
}
