class PaycheckSummary {
  const PaycheckSummary({
    required this.grossMinor,
    required this.taxWithheldMinor,
    required this.expensesMinor,
    required this.savingsMinor,
  });

  final int grossMinor;
  final int taxWithheldMinor;
  final int expensesMinor;
  final int savingsMinor;

  int get netMinor => grossMinor - taxWithheldMinor;
  int get remainingMinor => netMinor - expensesMinor - savingsMinor;
}
