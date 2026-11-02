import 'package:flutter_test/flutter_test.dart';
import 'package:paycheck_tracker/utils/money_amount.dart';

void main() {
  group('parseAmountToMinorUnits', () {
    test('converts decimal input without floating point arithmetic', () {
      expect(parseAmountToMinorUnits('12.34', fractionDigits: 2), 1234);
      expect(parseAmountToMinorUnits('1.2', fractionDigits: 2), 120);
      expect(parseAmountToMinorUnits(' 12 ', fractionDigits: 2), 1200);
    });

    test('supports currencies with zero or three decimal places', () {
      expect(parseAmountToMinorUnits('125', fractionDigits: 0), 125);
      expect(parseAmountToMinorUnits('1.025', fractionDigits: 3), 1025);
    });

    test('rejects excess precision and malformed values', () {
      expect(
        () => parseAmountToMinorUnits('1.234', fractionDigits: 2),
        throwsFormatException,
      );
      expect(
        () => parseAmountToMinorUnits('1,000', fractionDigits: 2),
        throwsFormatException,
      );
      expect(
        () => parseAmountToMinorUnits('-2.00', fractionDigits: 2),
        throwsFormatException,
      );
    });
  });

  group('formatMinorUnits', () {
    test('formats grouped values and preserves decimal precision', () {
      expect(formatMinorUnits(123456, fractionDigits: 2), '1,234.56');
      expect(formatMinorUnits(-25, fractionDigits: 2), '-0.25');
      expect(formatMinorUnits(125, fractionDigits: 0), '125');
      expect(formatMinorUnits(1025, fractionDigits: 3), '1.025');
    });
  });
}
