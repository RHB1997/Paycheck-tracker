import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:paycheck_tracker/models/money_entry.dart';
import 'package:paycheck_tracker/models/paycheck.dart';
import 'package:paycheck_tracker/screens/paycheck_detail_page.dart';
import 'package:paycheck_tracker/screens/paycheck_home_page.dart';

void main() {
  testWidgets('paycheck edit dialog saves changed values', (tester) async {
    final original = Paycheck(
      id: 4,
      label: 'Monthly pay',
      payDate: DateTime(2026, 10, 1),
      currencyCode: 'USD',
      grossMinor: 100000,
      taxWithheldMinor: 15000,
    );
    Paycheck? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                result = await showDialog<Paycheck>(
                  context: context,
                  builder: (_) => PaycheckFormDialog(initialPaycheck: original),
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Edit paycheck'), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.byKey(const ValueKey('paycheck-gross')))
          .controller
          ?.text,
      '1,000.00',
    );

    await tester.enterText(
      find.byKey(const ValueKey('paycheck-gross')),
      '1200.00',
    );
    await tester.enterText(
      find.byKey(const ValueKey('paycheck-tax')),
      '200.00',
    );
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(result?.id, 4);
    expect(result?.grossMinor, 120000);
    expect(result?.taxWithheldMinor, 20000);
    expect(result?.createdAt, original.createdAt);
  });

  testWidgets('entry edit dialog saves changed values and preserves its date', (
    tester,
  ) async {
    final paycheck = Paycheck(
      id: 8,
      label: 'Paycheck',
      payDate: DateTime(2026, 10, 1),
      currencyCode: 'USD',
      grossMinor: 100000,
      taxWithheldMinor: 10000,
    );
    final originalDate = DateTime(2026, 10, 4);
    final original = MoneyEntry(
      id: 12,
      paycheckId: 8,
      kind: MoneyEntryKind.expense,
      category: 'Food',
      note: 'Groceries',
      amountMinor: 2500,
      occurredAt: originalDate,
    );
    MoneyEntry? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                result = await showDialog<MoneyEntry>(
                  context: context,
                  builder: (_) => MoneyEntryFormDialog(
                    paycheck: paycheck,
                    initialEntry: original,
                  ),
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Edit entry'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('entry-category')),
      'Food',
    );
    await tester.enterText(find.byKey(const ValueKey('entry-amount')), '30.00');
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(result?.id, 12);
    expect(result?.amountMinor, 3000);
    expect(result?.occurredAt, originalDate);
    expect(result?.createdAt, original.createdAt);
  });
}
