import 'package:flutter_test/flutter_test.dart';
import 'package:paycheck_tracker/models/paycheck_summary.dart';

void main() {
  test('calculates net pay and remaining balance from allocations', () {
    const summary = PaycheckSummary(
      grossMinor: 500000,
      taxWithheldMinor: 75000,
      expensesMinor: 200000,
      savingsMinor: 50000,
    );

    expect(summary.netMinor, 425000);
    expect(summary.remainingMinor, 175000);
  });

  test('keeps negative remaining balance visible when over budget', () {
    const summary = PaycheckSummary(
      grossMinor: 10000,
      taxWithheldMinor: 0,
      expensesMinor: 12000,
      savingsMinor: 0,
    );

    expect(summary.remainingMinor, -2000);
  });
}
