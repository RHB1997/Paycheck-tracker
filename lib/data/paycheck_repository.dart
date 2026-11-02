import 'package:sqflite/sqflite.dart';

import '../models/money_entry.dart';
import '../models/paycheck.dart';
import '../models/paycheck_summary.dart';
import 'local_database.dart';

class PaycheckRepository {
  PaycheckRepository({LocalDatabase? localDatabase})
      : _localDatabase = localDatabase ?? LocalDatabase.instance;

  final LocalDatabase _localDatabase;

  Future<int> createPaycheck(Paycheck paycheck) async {
    _validatePaycheck(paycheck);
    final db = await _localDatabase.database;
    final now = DateTime.now().toUtc().toIso8601String();
    return db.insert(
      'paychecks',
      {
        ...paycheck.toMap(),
        'created_at': now,
        'updated_at': now,
      },
      conflictAlgorithm: ConflictAlgorithm.abort,
    );
  }

  Future<Paycheck?> getPaycheck(int id) async {
    final db = await _localDatabase.database;
    final rows = await db.query(
      'paychecks',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    return rows.isEmpty ? null : Paycheck.fromMap(rows.first);
  }

  Future<List<Paycheck>> listPaychecks() async {
    final db = await _localDatabase.database;
    final rows = await db.query(
      'paychecks',
      orderBy: 'pay_date DESC, id DESC',
    );
    return rows.map(Paycheck.fromMap).toList(growable: false);
  }

  Future<void> updatePaycheck(Paycheck paycheck) async {
    final id = paycheck.id;
    if (id == null) throw ArgumentError('A saved paycheck needs an id.');
    _validatePaycheck(paycheck);

    final db = await _localDatabase.database;
    final changed = await db.update(
      'paychecks',
      {
        ...paycheck.toMap(),
        'created_at': paycheck.createdAt.toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    if (changed == 0) throw StateError('Paycheck $id was not found.');
  }

  Future<void> deletePaycheck(int id) async {
    final db = await _localDatabase.database;
    await db.delete('paychecks', where: 'id = ?', whereArgs: [id]);
  }

  Future<int> addEntry(MoneyEntry entry) async {
    _validateEntry(entry);
    final db = await _localDatabase.database;
    final now = DateTime.now().toUtc().toIso8601String();
    return db.insert(
      'money_entries',
      {
        ...entry.toMap(),
        'created_at': now,
        'updated_at': now,
      },
      conflictAlgorithm: ConflictAlgorithm.abort,
    );
  }

  Future<List<MoneyEntry>> listEntries(int paycheckId) async {
    final db = await _localDatabase.database;
    final rows = await db.query(
      'money_entries',
      where: 'paycheck_id = ?',
      whereArgs: [paycheckId],
      orderBy: 'occurred_at DESC, id DESC',
    );
    return rows.map(MoneyEntry.fromMap).toList(growable: false);
  }

  Future<void> updateEntry(MoneyEntry entry) async {
    final id = entry.id;
    if (id == null) throw ArgumentError('A saved entry needs an id.');
    _validateEntry(entry);

    final db = await _localDatabase.database;
    final changed = await db.update(
      'money_entries',
      {
        ...entry.toMap(),
        'created_at': entry.createdAt.toUtc().toIso8601String(),
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    if (changed == 0) throw StateError('Entry $id was not found.');
  }

  Future<void> deleteEntry(int id) async {
    final db = await _localDatabase.database;
    await db.delete('money_entries', where: 'id = ?', whereArgs: [id]);
  }

  Future<PaycheckSummary?> getSummary(int paycheckId) async {
    final db = await _localDatabase.database;
    final rows = await db.rawQuery(
      '''
      SELECT
        p.gross_minor AS gross_minor,
        p.tax_withheld_minor AS tax_withheld_minor,
        COALESCE(SUM(CASE WHEN e.kind = 'expense' THEN e.amount_minor ELSE 0 END), 0)
          AS expenses_minor,
        COALESCE(SUM(CASE WHEN e.kind = 'saving' THEN e.amount_minor ELSE 0 END), 0)
          AS savings_minor
      FROM paychecks p
      LEFT JOIN money_entries e ON e.paycheck_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
      ''',
      [paycheckId],
    );
    if (rows.isEmpty) return null;

    final row = rows.first;
    return PaycheckSummary(
      grossMinor: row['gross_minor'] as int,
      taxWithheldMinor: row['tax_withheld_minor'] as int,
      expensesMinor: row['expenses_minor'] as int,
      savingsMinor: row['savings_minor'] as int,
    );
  }

  void _validatePaycheck(Paycheck paycheck) {
    if (paycheck.label.length > 80) {
      throw ArgumentError.value(paycheck.label, 'label', 'Must be 80 chars or fewer.');
    }
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(paycheck.currencyCode)) {
      throw ArgumentError.value(paycheck.currencyCode, 'currencyCode', 'Use a 3-letter uppercase currency code.');
    }
    if (paycheck.grossMinor < 0 ||
        paycheck.taxWithheldMinor < 0 ||
        paycheck.taxWithheldMinor > paycheck.grossMinor) {
      throw ArgumentError('Paycheck amounts are invalid.');
    }
  }

  void _validateEntry(MoneyEntry entry) {
    if (entry.paycheckId <= 0) {
      throw ArgumentError.value(entry.paycheckId, 'paycheckId', 'Must be positive.');
    }
    if (entry.category.isEmpty || entry.category.length > 50) {
      throw ArgumentError.value(entry.category, 'category', 'Must contain 1 to 50 chars.');
    }
    if (entry.note.length > 240) {
      throw ArgumentError.value(entry.note, 'note', 'Must be 240 chars or fewer.');
    }
    if (entry.amountMinor <= 0) {
      throw ArgumentError.value(entry.amountMinor, 'amountMinor', 'Must be positive.');
    }
  }
}
