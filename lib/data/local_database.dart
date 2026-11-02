import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';

class LocalDatabase {
  LocalDatabase._({this._factory, this._databasePath});

  LocalDatabase.forTesting({
    required DatabaseFactory factory,
    required String databasePath,
  }) : this._(factory: factory, databasePath: databasePath);

  static final LocalDatabase instance = LocalDatabase._();
  static const _databaseName = 'paycheck_tracker.db';
  static const _databaseVersion = 2;

  final DatabaseFactory? _factory;
  final String? _databasePath;
  Database? _database;

  Future<Database> get database async {
    final existing = _database;
    if (existing != null) return existing;

    final databasePath =
        _databasePath ?? path.join(await getDatabasesPath(), _databaseName);
    final opened = await (_factory ?? databaseFactory).openDatabase(
      databasePath,
      options: OpenDatabaseOptions(
        version: _databaseVersion,
        onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
        onCreate: _createSchema,
        onUpgrade: _upgradeSchema,
      ),
    );
    _database = opened;
    return opened;
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }

  Future<void> _createSchema(Database db, int version) async {
    await db.execute('''
      CREATE TABLE paychecks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= 80),
        pay_date TEXT NOT NULL,
        currency_code TEXT NOT NULL
          CHECK(currency_code GLOB '[A-Z][A-Z][A-Z]'),
        gross_minor INTEGER NOT NULL CHECK(gross_minor >= 0),
        tax_withheld_minor INTEGER NOT NULL
          CHECK(tax_withheld_minor >= 0 AND tax_withheld_minor <= gross_minor),
        fraction_digits INTEGER NOT NULL DEFAULT 2
          CHECK(fraction_digits BETWEEN 0 AND 3),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');
    await db.execute('''
      CREATE TABLE money_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paycheck_id INTEGER NOT NULL
          REFERENCES paychecks(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('expense', 'saving')),
        category TEXT NOT NULL CHECK(length(category) BETWEEN 1 AND 50),
        note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 240),
        amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');
    await db.execute(
      'CREATE INDEX paychecks_by_date ON paychecks(pay_date DESC, id DESC)',
    );
    await db.execute(
      'CREATE INDEX entries_by_paycheck_date '
      'ON money_entries(paycheck_id, occurred_at DESC, id DESC)',
    );
  }

  Future<void> _upgradeSchema(
    Database db,
    int oldVersion,
    int newVersion,
  ) async {
    if (oldVersion < 2) {
      await db.execute('''
        ALTER TABLE paychecks ADD COLUMN fraction_digits INTEGER NOT NULL
          DEFAULT 2 CHECK(fraction_digits BETWEEN 0 AND 3)
      ''');
    }
  }
}
