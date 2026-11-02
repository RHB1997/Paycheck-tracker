import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/paycheck_repository.dart';
import '../models/money_entry.dart';
import '../models/paycheck.dart';
import '../models/paycheck_summary.dart';
import '../utils/money_amount.dart';

class PaycheckDetailPage extends StatefulWidget {
  const PaycheckDetailPage({
    super.key,
    required this.paycheck,
    required this.repository,
  });

  final Paycheck paycheck;
  final PaycheckRepository repository;

  @override
  State<PaycheckDetailPage> createState() => _PaycheckDetailPageState();
}

class _PaycheckDetailPageState extends State<PaycheckDetailPage> {
  late Future<(PaycheckSummary?, List<MoneyEntry>)> _data;

  @override
  void initState() {
    super.initState();
    _data = _loadData();
  }

  Future<(PaycheckSummary?, List<MoneyEntry>)> _loadData() async {
    final paycheckId = widget.paycheck.id!;
    final summary = await widget.repository.getSummary(paycheckId);
    final entries = await widget.repository.listEntries(paycheckId);
    return (summary, entries);
  }

  Future<void> _reload() async {
    setState(() => _data = _loadData());
    await _data;
  }

  Future<void> _addEntry() async {
    final entry = await showDialog<MoneyEntry>(
      context: context,
      builder: (_) => MoneyEntryFormDialog(paycheck: widget.paycheck),
    );
    if (entry == null || !mounted) return;
    await widget.repository.addEntry(entry);
    await _reload();
  }

  Future<void> _editEntry(MoneyEntry entry) async {
    final updated = await showDialog<MoneyEntry>(
      context: context,
      builder: (_) =>
          MoneyEntryFormDialog(paycheck: widget.paycheck, initialEntry: entry),
    );
    if (updated == null || !mounted) return;
    await widget.repository.updateEntry(updated);
    await _reload();
  }

  Future<void> _deleteEntry(MoneyEntry entry) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete entry?'),
        content: const Text('This entry will be removed from this paycheck.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (shouldDelete != true || !mounted) return;
    await widget.repository.deleteEntry(entry.id!);
    await _reload();
  }

  String _amount(int amount) =>
      '${widget.paycheck.currencyCode} ${formatMinorUnits(amount, fractionDigits: widget.paycheck.fractionDigits)}';

  @override
  Widget build(BuildContext context) {
    final paycheck = widget.paycheck;
    return Scaffold(
      appBar: AppBar(
        title: Text(paycheck.label.isEmpty ? 'Paycheck' : paycheck.label),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addEntry,
        icon: const Icon(Icons.add),
        label: const Text('Add expense or saving'),
      ),
      body: FutureBuilder<(PaycheckSummary?, List<MoneyEntry>)>(
        future: _data,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || snapshot.data?.$1 == null) {
            return _DetailError(onRetry: _reload);
          }

          final summary = snapshot.data!.$1!;
          final entries = snapshot.data!.$2;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
            children: [
              _SummaryCard(
                paycheck: paycheck,
                summary: summary,
                amount: _amount,
              ),
              const SizedBox(height: 24),
              Text('Activity', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 10),
              if (entries.isEmpty)
                const _EmptyActivity()
              else
                ...entries.map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _EntryTile(
                      entry: entry,
                      amount: _amount(entry.amountMinor),
                      onEdit: () => _editEntry(entry),
                      onDelete: () => _deleteEntry(entry),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.paycheck,
    required this.summary,
    required this.amount,
  });

  final Paycheck paycheck;
  final PaycheckSummary summary;
  final String Function(int) amount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Paycheck summary', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(DateFormat.yMMMMd().format(paycheck.payDate)),
            const SizedBox(height: 18),
            _SummaryRow(label: 'Gross pay', value: amount(summary.grossMinor)),
            _SummaryRow(
              label: 'Tax withheld',
              value: amount(summary.taxWithheldMinor),
            ),
            const Divider(height: 20),
            _SummaryRow(label: 'Net pay', value: amount(summary.netMinor)),
            _SummaryRow(
              label: 'Expenses',
              value: amount(summary.expensesMinor),
            ),
            _SummaryRow(label: 'Savings', value: amount(summary.savingsMinor)),
            const Divider(height: 20),
            _SummaryRow(
              label: 'Remaining',
              value: amount(summary.remainingMinor),
              emphasized: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.emphasized = false,
  });

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final style = emphasized
        ? Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)
        : Theme.of(context).textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({
    required this.entry,
    required this.amount,
    required this.onEdit,
    required this.onDelete,
  });

  final MoneyEntry entry;
  final String amount;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final isSaving = entry.kind == MoneyEntryKind.saving;
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(isSaving ? Icons.savings_outlined : Icons.receipt_long),
        ),
        title: Text(entry.note.isEmpty ? entry.category : entry.note),
        subtitle: Text(
          '${entry.category} · ${DateFormat.yMMMd().format(entry.occurredAt.toLocal())}',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${isSaving ? '+' : '−'}$amount'),
            PopupMenuButton<String>(
              tooltip: 'Entry options',
              onSelected: (action) {
                if (action == 'edit') onEdit();
                if (action == 'delete') onDelete();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'edit', child: Text('Edit')),
                PopupMenuItem(value: 'delete', child: Text('Delete')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyActivity extends StatelessWidget {
  const _EmptyActivity();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Text('No expenses or savings yet. Add your first entry.'),
      ),
    );
  }
}

class _DetailError extends StatelessWidget {
  const _DetailError({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Could not load this paycheck.'),
          TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}

class MoneyEntryFormDialog extends StatefulWidget {
  const MoneyEntryFormDialog({
    super.key,
    required this.paycheck,
    this.initialEntry,
  });

  final Paycheck paycheck;
  final MoneyEntry? initialEntry;

  @override
  State<MoneyEntryFormDialog> createState() => _MoneyEntryFormDialogState();
}

class _MoneyEntryFormDialogState extends State<MoneyEntryFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _category = TextEditingController(
    text: widget.initialEntry?.category ?? '',
  );
  late final _note = TextEditingController(
    text: widget.initialEntry?.note ?? '',
  );
  late final _amount = TextEditingController(
    text: widget.initialEntry == null
        ? ''
        : formatMinorUnits(
            widget.initialEntry!.amountMinor,
            fractionDigits: widget.paycheck.fractionDigits,
          ),
  );
  late MoneyEntryKind _kind =
      widget.initialEntry?.kind ?? MoneyEntryKind.expense;

  @override
  void dispose() {
    _category.dispose();
    _note.dispose();
    _amount.dispose();
    super.dispose();
  }

  String? _validateAmount(String? value) {
    try {
      final amount = parseAmountToMinorUnits(
        value ?? '',
        fractionDigits: widget.paycheck.fractionDigits,
      );
      return amount > 0 ? null : 'Enter an amount greater than zero.';
    } on FormatException catch (error) {
      return error.message;
    }
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      MoneyEntry(
        id: widget.initialEntry?.id,
        paycheckId: widget.paycheck.id!,
        kind: _kind,
        category: _category.text.trim(),
        note: _note.text.trim(),
        amountMinor: parseAmountToMinorUnits(
          _amount.text,
          fractionDigits: widget.paycheck.fractionDigits,
        ),
        occurredAt: widget.initialEntry?.occurredAt ?? DateTime.now(),
        createdAt: widget.initialEntry?.createdAt,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.initialEntry == null ? 'Add an entry' : 'Edit entry'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<MoneyEntryKind>(
                initialValue: _kind,
                decoration: const InputDecoration(labelText: 'Type'),
                items: const [
                  DropdownMenuItem(
                    value: MoneyEntryKind.expense,
                    child: Text('Expense'),
                  ),
                  DropdownMenuItem(
                    value: MoneyEntryKind.saving,
                    child: Text('Savings contribution'),
                  ),
                ],
                onChanged: (value) => setState(() {
                  _kind = value ?? MoneyEntryKind.expense;
                }),
              ),
              TextFormField(
                key: const ValueKey('entry-category'),
                controller: _category,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  hintText: 'Rent, food, emergency fund',
                ),
                textCapitalization: TextCapitalization.sentences,
                maxLength: 50,
                validator: (value) =>
                    (value ?? '').trim().isEmpty ? 'Enter a category.' : null,
              ),
              TextFormField(
                key: const ValueKey('entry-note'),
                controller: _note,
                decoration: const InputDecoration(labelText: 'Note (optional)'),
                textCapitalization: TextCapitalization.sentences,
                maxLength: 240,
              ),
              TextFormField(
                key: const ValueKey('entry-amount'),
                controller: _amount,
                decoration: InputDecoration(
                  labelText: 'Amount (${widget.paycheck.currencyCode})',
                ),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: _validateAmount,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _save,
          child: Text(
            widget.initialEntry == null ? 'Save entry' : 'Save changes',
          ),
        ),
      ],
    );
  }
}
