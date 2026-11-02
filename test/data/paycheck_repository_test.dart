import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;
import 'package:paycheck_tracker/data/local_database.dart';
import 'package:paycheck_tracker/data/paycheck_repository.dart';
import 'package:paycheck_tracker/models/money_entry.dart';
import 'package:paycheck_tracker/models/paycheck.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late LocalDatabase localDatabase;
  late PaycheckRepository repository;
  late String databasePath;

  setUpAll(sqfliteFfiInit);

  setUp(() async {
    databasePath = path.join(
      Directory.systemTemp.path,
      'paycheck_tracker_${DateTime.now().microsecondsSinceEpoch}.db',
    );
    localDatabase = LocalDatabase.forTesting(
      factory: databaseFactoryFfi,
      databasePath: databasePath,
    );
    repository = PaycheckRepository(localDatabase: localDatabase);
  });

  tearDown(() async {
    await localDatabase.close();
    await databaseFactoryFfi.deleteDatabase(databasePath);
  });

  test('updates paycheck and entry values and recalculates totals', () async {
    final paycheckId = await repository.createPaycheck(
      Paycheck(
        label: 'September pay',
        payDate: DateTime(2026, 9, 1),
        currencyCode: 'IQD',
        grossMinor: 1000000,
        taxWithheldMinor: 100000,
        fractionDigits: 3,
      ),
    );
    final entryId = await repository.addEntry(
      MoneyEntry(
        paycheckId: paycheckId,
        kind: MoneyEntryKind.expense,
        category: 'Rent',
        amountMinor: 250000,
        occurredAt: DateTime(2026, 9, 2),
      ),
    );
    await repository.addEntry(
      MoneyEntry(
        paycheckId: paycheckId,
        kind: MoneyEntryKind.saving,
        category: 'Emergency fund',
        amountMinor: 100000,
        occurredAt: DateTime(2026, 9, 3),
      ),
    );

    final savedPaycheck = (await repository.getPaycheck(paycheckId))!;
    await repository.updatePaycheck(
      Paycheck(
        id: savedPaycheck.id,
        label: 'Updated September pay',
        payDate: savedPaycheck.payDate,
        currencyCode: savedPaycheck.currencyCode,
        grossMinor: 1100000,
        taxWithheldMinor: 100000,
        fractionDigits: savedPaycheck.fractionDigits,
        createdAt: savedPaycheck.createdAt,
      ),
    );

    final savedEntry = (await repository.listEntries(
      paycheckId,
    )).firstWhere((entry) => entry.id == entryId);
    await repository.updateEntry(
      MoneyEntry(
        id: entryId,
        paycheckId: paycheckId,
        kind: MoneyEntryKind.expense,
        category: 'Housing',
        amountMinor: 300000,
        occurredAt: savedEntry.occurredAt,
        createdAt: savedEntry.createdAt,
      ),
    );

    final updatedPaycheck = await repository.getPaycheck(paycheckId);
    final updatedEntries = await repository.listEntries(paycheckId);
    final summary = await repository.getSummary(paycheckId);

    expect(updatedPaycheck?.label, 'Updated September pay');
    expect(updatedPaycheck?.fractionDigits, 3);
    expect(
      updatedEntries.firstWhere((entry) => entry.id == entryId).category,
      'Housing',
    );
    expect(summary?.netMinor, 1000000);
    expect(summary?.expensesMinor, 300000);
    expect(summary?.savingsMinor, 100000);
    expect(summary?.remainingMinor, 600000);
  });

  test('deleting a paycheck also deletes its entries', () async {
    final paycheckId = await repository.createPaycheck(
      Paycheck(
        label: 'October pay',
        payDate: DateTime(2026, 10, 1),
        currencyCode: 'USD',
        grossMinor: 500000,
        taxWithheldMinor: 50000,
      ),
    );
    await repository.addEntry(
      MoneyEntry(
        paycheckId: paycheckId,
        kind: MoneyEntryKind.expense,
        category: 'Food',
        amountMinor: 20000,
        occurredAt: DateTime(2026, 10, 2),
      ),
    );

    await repository.deletePaycheck(paycheckId);

    expect(await repository.getPaycheck(paycheckId), isNull);
    expect(await repository.listEntries(paycheckId), isEmpty);
    expect(await repository.getSummary(paycheckId), isNull);
  });

  test('upgrades existing paychecks with two decimal places', () async {
    final oldDatabase = await databaseFactoryFfi.openDatabase(
      databasePath,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, _) async {
          await db.execute('''
            CREATE TABLE paychecks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              label TEXT NOT NULL DEFAULT '',
              pay_date TEXT NOT NULL,
              currency_code TEXT NOT NULL,
              gross_minor INTEGER NOT NULL,
              tax_withheld_minor INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          ''');
          await db.insert('paychecks', {
            'label': 'Saved before update',
            'pay_date': '2026-01-01',
            'currency_code': 'USD',
            'gross_minor': 10000,
            'tax_withheld_minor': 1000,
            'created_at': '2026-01-01T00:00:00.000Z',
            'updated_at': '2026-01-01T00:00:00.000Z',
          });
        },
      ),
    );
    await oldDatabase.close();

    final paycheck = await repository.getPaycheck(1);

    expect(paycheck?.label, 'Saved before update');
    expect(paycheck?.fractionDigits, 2);
  });
}
