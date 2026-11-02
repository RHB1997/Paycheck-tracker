class Paycheck {
  Paycheck({
    this.id,
    required this.label,
    required this.payDate,
    required this.currencyCode,
    required this.grossMinor,
    required this.taxWithheldMinor,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now().toUtc(),
        updatedAt = updatedAt ?? DateTime.now().toUtc();

  final int? id;
  final String label;
  final DateTime payDate;
  final String currencyCode;
  final int grossMinor;
  final int taxWithheldMinor;
  final DateTime createdAt;
  final DateTime updatedAt;

  int get netMinor => grossMinor - taxWithheldMinor;

  factory Paycheck.fromMap(Map<String, Object?> map) {
    return Paycheck(
      id: map['id'] as int,
      label: map['label'] as String,
      payDate: DateTime.parse('${map['pay_date']}T00:00:00'),
      currencyCode: map['currency_code'] as String,
      grossMinor: map['gross_minor'] as int,
      taxWithheldMinor: map['tax_withheld_minor'] as int,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }

  Map<String, Object?> toMap() => {
        'label': label,
        'pay_date': _dateOnly(payDate),
        'currency_code': currencyCode,
        'gross_minor': grossMinor,
        'tax_withheld_minor': taxWithheldMinor,
        'created_at': createdAt.toUtc().toIso8601String(),
        'updated_at': updatedAt.toUtc().toIso8601String(),
      };
}

String _dateOnly(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}
