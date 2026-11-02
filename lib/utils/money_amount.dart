import 'package:intl/intl.dart';

int parseAmountToMinorUnits(String input, {required int fractionDigits}) {
  _validateFractionDigits(fractionDigits);
  final value = input.trim();
  final pattern = fractionDigits == 0
      ? RegExp(r'^\d+$')
      : RegExp('^\\d+(?:\\.\\d{1,$fractionDigits})?\$');
  if (!pattern.hasMatch(value)) {
    throw FormatException(
      'Enter an amount with up to $fractionDigits decimals.',
    );
  }

  final parts = value.split('.');
  final scale = _scaleFor(fractionDigits);
  final whole = int.parse(parts.first);
  if (parts.length == 1 || fractionDigits == 0) return whole * scale;

  final fraction = int.parse(parts.last.padRight(fractionDigits, '0'));
  return whole * scale + fraction;
}

String formatMinorUnits(
  int amountMinor, {
  required int fractionDigits,
  String locale = 'en_US',
}) {
  _validateFractionDigits(fractionDigits);
  final scale = _scaleFor(fractionDigits);
  final isNegative = amountMinor < 0;
  final absoluteAmount = amountMinor.abs();
  final whole = absoluteAmount ~/ scale;
  final wholeText = NumberFormat.decimalPattern(locale).format(whole);
  if (fractionDigits == 0) return '${isNegative ? '-' : ''}$wholeText';

  final fraction = (absoluteAmount % scale).toString().padLeft(
    fractionDigits,
    '0',
  );
  return '${isNegative ? '-' : ''}$wholeText.$fraction';
}

int _scaleFor(int fractionDigits) => switch (fractionDigits) {
  0 => 1,
  1 => 10,
  2 => 100,
  3 => 1000,
  _ => throw ArgumentError.value(
    fractionDigits,
    'fractionDigits',
    'Must be between 0 and 3.',
  ),
};

void _validateFractionDigits(int fractionDigits) {
  if (fractionDigits < 0 || fractionDigits > 3) {
    throw ArgumentError.value(
      fractionDigits,
      'fractionDigits',
      'Must be between 0 and 3.',
    );
  }
}
