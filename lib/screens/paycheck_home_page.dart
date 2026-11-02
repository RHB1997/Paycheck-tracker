import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/paycheck_repository.dart';
import '../models/paycheck.dart';
import '../utils/money_amount.dart';
import 'paycheck_detail_page.dart';

class PaycheckHomePage extends StatefulWidget {
  PaycheckHomePage({super.key, PaycheckRepository? repository})
    : repository = repository ?? PaycheckRepository();

  final PaycheckRepository repository;

  @override
  State<PaycheckHomePage> createState() => _PaycheckHomePageState();
}

class _PaycheckHomePageState extends State<PaycheckHomePage> {
  late Future<List<Paycheck>> _paychecks;

  @override
  void initState() {
    super.initState();
    _paychecks = widget.repository.listPaychecks();
  }

  Future<void> _reload() async {
    setState(() => _paychecks = widget.repository.listPaychecks());
    await _paychecks;
  }

  Future<void> _addPaycheck() async {
    final paycheck = await showDialog<Paycheck>(
      context: context,
      builder: (_) => const PaycheckFormDialog(),
    );
    if (paycheck == null || !mounted) return;
    await widget.repository.createPaycheck(paycheck);
    await _reload();
  }

  Future<void> _openPaycheck(Paycheck paycheck) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => PaycheckDetailPage(
          paycheck: paycheck,
          repository: widget.repository,
        ),
      ),
    );
    if (mounted) await _reload();
  }

  Future<void> _editPaycheck(Paycheck paycheck) async {
    final updated = await showDialog<Paycheck>(
      context: context,
      builder: (_) => PaycheckFormDialog(initialPaycheck: paycheck),
    );
    if (updated == null || !mounted) return;
    await widget.repository.updatePaycheck(updated);
    await _reload();
  }

  Future<void> _deletePaycheck(Paycheck paycheck) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete paycheck?'),
        content: const Text(
          'This also deletes its expense and savings entries.',
        ),
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
    await widget.repository.deletePaycheck(paycheck.id!);
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Paycheck Tracker')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addPaycheck,
        icon: const Icon(Icons.add),
        label: const Text('Add paycheck'),
      ),
      body: FutureBuilder<List<Paycheck>>(
        future: _paychecks,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _LoadError(onRetry: _reload);
          }

          final paychecks = snapshot.data ?? const <Paycheck>[];
          if (paychecks.isEmpty) return const _EmptyPaychecks();

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
            itemCount: paychecks.length + 1,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              if (index == 0) {
                return const _Intro();
              }
              final paycheck = paychecks[index - 1];
              return _PaycheckCard(
                paycheck: paycheck,
                onTap: () => _openPaycheck(paycheck),
                onEdit: () => _editPaycheck(paycheck),
                onDelete: () => _deletePaycheck(paycheck),
              );
            },
          );
        },
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your pay, clearly accounted for.',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
          ),
          SizedBox(height: 6),
          Text('Choose a paycheck to see its expenses and savings.'),
        ],
      ),
    );
  }
}

class _PaycheckCard extends StatelessWidget {
  const _PaycheckCard({
    required this.paycheck,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  final Paycheck paycheck;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.surface,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(
            Icons.payments_outlined,
            color: theme.colorScheme.primary,
          ),
        ),
        title: Text(
          paycheck.label.isEmpty ? 'Paycheck' : paycheck.label,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(DateFormat.yMMMd().format(paycheck.payDate)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${paycheck.currencyCode} ${formatMinorUnits(paycheck.netMinor, fractionDigits: paycheck.fractionDigits)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text('net pay', style: theme.textTheme.labelSmall),
              ],
            ),
            PopupMenuButton<String>(
              tooltip: 'Paycheck options',
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
        onTap: onTap,
      ),
    );
  }
}

class _EmptyPaychecks extends StatelessWidget {
  const _EmptyPaychecks();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.account_balance_wallet_outlined,
              size: 52,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Start with your next paycheck',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text(
              'Add your gross pay and tax withheld. Then track what you spend and save.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Could not load paychecks.'),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ),
    );
  }
}

class PaycheckFormDialog extends StatefulWidget {
  const PaycheckFormDialog({super.key, this.initialPaycheck});

  final Paycheck? initialPaycheck;

  @override
  State<PaycheckFormDialog> createState() => _PaycheckFormDialogState();
}

class _PaycheckFormDialogState extends State<PaycheckFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final _label = TextEditingController(
    text: widget.initialPaycheck?.label ?? '',
  );
  late final _currency = TextEditingController(
    text: widget.initialPaycheck?.currencyCode ?? '',
  );
  late final _gross = TextEditingController(
    text: widget.initialPaycheck == null
        ? ''
        : formatMinorUnits(
            widget.initialPaycheck!.grossMinor,
            fractionDigits: widget.initialPaycheck!.fractionDigits,
          ),
  );
  late final _tax = TextEditingController(
    text: widget.initialPaycheck == null
        ? '0'
        : formatMinorUnits(
            widget.initialPaycheck!.taxWithheldMinor,
            fractionDigits: widget.initialPaycheck!.fractionDigits,
          ),
  );
  late DateTime _payDate = widget.initialPaycheck?.payDate ?? DateTime.now();
  late int _fractionDigits = widget.initialPaycheck?.fractionDigits ?? 2;
  String? _formError;

  @override
  void dispose() {
    _label.dispose();
    _currency.dispose();
    _gross.dispose();
    _tax.dispose();
    super.dispose();
  }

  String? _validateAmount(String? value) {
    try {
      parseAmountToMinorUnits(value ?? '', fractionDigits: _fractionDigits);
      return null;
    } on FormatException catch (error) {
      return error.message;
    }
  }

  Future<void> _chooseDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _payDate,
      firstDate: DateTime(1970),
      lastDate: DateTime(2200),
    );
    if (selected != null) setState(() => _payDate = selected);
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    final currencyCode = _currency.text.trim().toUpperCase();
    final gross = parseAmountToMinorUnits(
      _gross.text,
      fractionDigits: _fractionDigits,
    );
    final tax = parseAmountToMinorUnits(
      _tax.text,
      fractionDigits: _fractionDigits,
    );
    if (tax > gross) {
      setState(() => _formError = 'Tax withheld cannot exceed gross pay.');
      return;
    }
    Navigator.of(context).pop(
      Paycheck(
        id: widget.initialPaycheck?.id,
        label: _label.text.trim(),
        payDate: _payDate,
        currencyCode: currencyCode,
        grossMinor: gross,
        taxWithheldMinor: tax,
        fractionDigits: _fractionDigits,
        createdAt: widget.initialPaycheck?.createdAt,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.initialPaycheck == null ? 'Add paycheck' : 'Edit paycheck',
      ),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                key: const ValueKey('paycheck-label'),
                controller: _label,
                decoration: const InputDecoration(
                  labelText: 'Label (optional)',
                ),
                textCapitalization: TextCapitalization.sentences,
                maxLength: 80,
              ),
              TextFormField(
                key: const ValueKey('paycheck-currency'),
                controller: _currency,
                decoration: const InputDecoration(
                  labelText: 'Currency code',
                  hintText: 'USD',
                ),
                textCapitalization: TextCapitalization.characters,
                maxLength: 3,
                validator: (value) =>
                    RegExp(r'^[A-Za-z]{3}$').hasMatch((value ?? '').trim())
                    ? null
                    : 'Enter a 3-letter currency code.',
              ),
              DropdownButtonFormField<int>(
                initialValue: _fractionDigits,
                decoration: const InputDecoration(
                  labelText: 'Currency decimal places',
                ),
                items: const [0, 1, 2, 3]
                    .map(
                      (digits) => DropdownMenuItem(
                        value: digits,
                        child: Text('$digits'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() {
                  _fractionDigits = value ?? 2;
                }),
              ),
              TextFormField(
                key: const ValueKey('paycheck-gross'),
                controller: _gross,
                decoration: const InputDecoration(labelText: 'Gross pay'),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: _validateAmount,
              ),
              TextFormField(
                key: const ValueKey('paycheck-tax'),
                controller: _tax,
                decoration: const InputDecoration(labelText: 'Tax withheld'),
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: _validateAmount,
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _chooseDate,
                  icon: const Icon(Icons.calendar_today_outlined),
                  label: Text(DateFormat.yMMMd().format(_payDate)),
                ),
              ),
              if (_formError != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    _formError!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
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
            widget.initialPaycheck == null ? 'Save paycheck' : 'Save changes',
          ),
        ),
      ],
    );
  }
}
