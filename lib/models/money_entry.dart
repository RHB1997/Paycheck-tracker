enum MoneyEntryKind { expense, saving }

class MoneyEntry {
  MoneyEntry({
    this.id,
    required this.paycheckId,
    required this.kind,
    required this.category,
    this.note = '',
    required this.amountMinor,
    required this.occurredAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now().toUtc(),
        updatedAt = updatedAt ?? DateTime.now().toUtc();

  final int? id;
  final int paycheckId;
  final MoneyEntryKind kind;
  final String category;
  final String note;
  final int amountMinor;
  final DateTime occurredAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory MoneyEntry.fromMap(Map<String, Object?> map) {
    return MoneyEntry(
      id: map['id'] as int,
      paycheckId: map['paycheck_id'] as int,
      kind: MoneyEntryKind.values.byName(map['kind'] as String),
      category: map['category'] as String,
      note: map['note'] as String,
      amountMinor: map['amount_minor'] as int,
      occurredAt: DateTime.parse(map['occurred_at'] as String),
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }

  Map<String, Object?> toMap() => {
        'paycheck_id': paycheckId,
        'kind': kind.name,
        'category': category,
        'note': note,
        'amount_minor': amountMinor,
        'occurred_at': occurredAt.toUtc().toIso8601String(),
        'created_at': createdAt.toUtc().toIso8601String(),
        'updated_at': updatedAt.toUtc().toIso8601String(),
      };
}
