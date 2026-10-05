import { describe, expect, it } from 'vitest';
import {
	DEFAULT_MAX_DEPTH,
	DEFAULT_MAX_STEPS,
	Interpreter,
	evaluate,
	lockedName,
	type RunResult
} from './interpreter';
import { formatTrace } from './trace';

/** Each top-level form's printed value, or "error: message". */
function results(code: string, options = {}): string[] {
	return outcome(evaluate(code, options));
}

function outcome(r: RunResult): string[] {
	return r.forms.map((f) => (f.error ? `error: ${f.error.message}` : f.printed!));
}

/** The printed value of the last form. */
function last(code: string): string {
	const r = results(code);
	return r[r.length - 1];
}

/** Golden table: expression → printed result (Common Lisp's). */
const GOLDEN: [string, string][] = [
	// Atoms and quote
	['42', '42'],
	['-7', '-7'],
	['3.5', '3.5'],
	['"hello"', '"hello"'],
	['nil', 'NIL'],
	['()', 'NIL'],
	['t', 'T'],
	[':key', ':KEY'],
	["'a", 'A'],
	["'(a b c)", '(A B C)'],
	["'(a . b)", '(A . B)'],
	['(quote (1 2))', '(1 2)'],
	["''a", "'A"],
	["(car ''a)", 'QUOTE'],
	["'(+ 1 2)", '(+ 1 2)'],
	["(list 'a (+ 1 2) '(+ 1 2))", '(A 3 (+ 1 2))'],
	// List operations
	["(car '(a b c))", 'A'],
	["(cdr '(a b c))", '(B C)'],
	["(car '())", 'NIL'],
	["(cdr '(a))", 'NIL'],
	["(car (cdr '(a b c)))", 'B'],
	["(cadr '(a b c))", 'B'],
	["(cddr '(a b c))", '(C)'],
	["(caar '((a b) c))", 'A'],
	["(cdar '((a b) c))", '(B)'],
	["(caddr '(a b c d))", 'C'],
	["(cadddr '(a b c d))", 'D'],
	["(cons 'a '(b c))", '(A B C)'],
	["(cons '(a) '(b c))", '((A) B C)'],
	['(cons 1 2)', '(1 . 2)'],
	["(cons 1 '(2))", '(1 2)'],
	['(cons 1 nil)', '(1)'],
	["(list 1 '(2))", '(1 (2))'],
	["(list '(a) '(b c))", '((A) (B C))'],
	['(list)', 'NIL'],
	["(append '(a) '(b c))", '(A B C)'],
	["(append '(1 2) '(3) '() '(4 5))", '(1 2 3 4 5)'],
	["(append '(1) 2)", '(1 . 2)'],
	['(append)', 'NIL'],
	["(list* 1 2 '(3 4))", '(1 2 3 4)'],
	["(reverse '(1 (2 3) 4))", '(4 (2 3) 1)'],
	['(reverse "abc")', '"cba"'],
	["(length '(a (b c) d))", '3'],
	['(length "hello")', '5'],
	['(length nil)', '0'],
	["(first '(1 2 3))", '1'],
	["(second '(1 2 3))", '2'],
	["(third '(1 2 3))", '3'],
	["(fourth '(1 2 3))", 'NIL'],
	["(rest '(1 2 3))", '(2 3)'],
	["(last '(1 2 3))", '(3)'],
	["(last '(1 2 3) 2)", '(2 3)'],
	['(last nil)', 'NIL'],
	["(butlast '(1 2 3))", '(1 2)'],
	["(nth 0 '(a b c))", 'A'],
	["(nth 2 '(a b c))", 'C'],
	["(nth 5 '(a b c))", 'NIL'],
	["(nthcdr 1 '(a b c))", '(B C)'],
	["(nthcdr 9 '(a b c))", 'NIL'],
	["(member 'c '(a b c d))", '(C D)'],
	["(member 'z '(a b))", 'NIL'],
	["(member '(a) '((a) (b)))", 'NIL'],
	["(member '(a) '((a) (b)) :test #'equal)", '((A) (B))'],
	["(member 2.0 '(1 2 3) :test #'=)", '(2 3)'],
	["(assoc 'b '((a . 1) (b . 2)))", '(B . 2)'],
	["(assoc 'z '((a . 1)))", 'NIL'],
	["(cdr (assoc 'b '((a 1) (b 2))))", '(2)'],
	['(assoc "b" \'(("a" . 1) ("b" . 2)) :test #\'equal)', '("b" . 2)'],
	["(remove 'a '(a b a c))", '(B C)'],
	["(remove 3 '(1 2 3 4 3))", '(1 2 4)'],
	["(remove-if #'evenp '(1 2 3 4 5))", '(1 3 5)'],
	["(remove-if-not #'evenp '(1 2 3 4 5))", '(2 4)'],
	["(sort '(3 1 2) #'<)", '(1 2 3)'],
	["(copy-list '(1 2))", '(1 2)'],
	["(nreverse '(1 2 3))", '(3 2 1)'],
	["(nconc '(1) '(2))", '(1 2)'],
	// Predicates
	['(null nil)', 'T'],
	["(null '(a))", 'NIL'],
	["(atom 'a)", 'T'],
	["(atom '(a))", 'NIL'],
	['(atom nil)', 'T'],
	['(listp nil)', 'T'],
	["(listp '(1))", 'T'],
	['(listp 1)', 'NIL'],
	['(consp nil)', 'NIL'],
	["(consp '(1))", 'T'],
	['(numberp 1/2)', 'T'],
	["(numberp 'a)", 'NIL'],
	['(integerp 3)', 'T'],
	['(integerp 3.0)', 'NIL'],
	["(symbolp 'a)", 'T'],
	['(symbolp nil)', 'T'],
	['(symbolp "a")', 'NIL'],
	['(stringp "a")', 'T'],
	["(functionp #'car)", 'T'],
	['(zerop 0)', 'T'],
	['(zerop 0.0)', 'T'],
	['(plusp 5)', 'T'],
	['(minusp -5)', 'T'],
	['(evenp 4)', 'T'],
	['(oddp 4)', 'NIL'],
	['(not nil)', 'T'],
	['(not 3)', 'NIL'],
	["(eq 'a 'a)", 'T'],
	["(eq '(a) '(a))", 'NIL'],
	['(eq 3 3)', 'T'],
	['(eql 3 3)', 'T'],
	['(eql 3 3.0)', 'NIL'],
	['(eql 1/2 1/2)', 'T'],
	["(equal '(a (b)) '(a (b)))", 'T'],
	['(equal "abc" "abc")', 'T'],
	['(eq "abc" "abc")', 'NIL'],
	["(equal '(1 2) '(1 2 3))", 'NIL'],
	// Arithmetic
	['(+ 1 2 3)', '6'],
	['(+)', '0'],
	['(*)', '1'],
	['(* 2 3 4)', '24'],
	['(- 10 3 2)', '5'],
	['(- 5)', '-5'],
	['(/ 12 4)', '3'],
	['(/ 1 2)', '1/2'],
	['(/ 6 4)', '3/2'],
	['(/ 2)', '1/2'],
	['(/ 1.0 2)', '0.5'],
	['(/ 1 3.0)', '0.33333334'],
	['(+ 1/2 1/2)', '1'],
	['(+ 1/3 1/6)', '1/2'],
	['(+ 1 2.0)', '3.0'],
	['(+ 0.1 0.2)', '0.3'],
	['(* 1.5 2)', '3.0'],
	['(= 1 1.0)', 'T'],
	['(= 1 2)', 'NIL'],
	['(/= 1 2 3)', 'T'],
	['(/= 1 2 1)', 'NIL'],
	['(< 1 2 3)', 'T'],
	['(< 1 3 2)', 'NIL'],
	['(> 3 2 1)', 'T'],
	['(<= 1 1 2)', 'T'],
	['(>= 2 2 3)', 'NIL'],
	['(mod 7 3)', '1'],
	['(mod -7 3)', '2'],
	['(mod 7 -3)', '-2'],
	['(rem -7 3)', '-1'],
	['(mod 7.5 2)', '1.5'],
	['(max 3 9 2)', '9'],
	['(min 3 9 2)', '2'],
	['(max 1 2.5)', '2.5'],
	['(abs -4)', '4'],
	['(abs 1/2)', '1/2'],
	['(1+ 5)', '6'],
	['(1- 5)', '4'],
	['(sqrt 16)', '4.0'],
	['(sqrt 2)', '1.4142135'],
	['(expt 2 10)', '1024'],
	['(expt 2 100)', '1267650600228229401496703205376'],
	['(expt 2 -2)', '1/4'],
	['(expt 2.0 3)', '8.0'],
	['(expt 4 1/2)', '2.0'],
	['(floor 7 2)', '3'],
	['(floor -7 2)', '-4'],
	['(floor 2.5)', '2'],
	['(ceiling 7 2)', '4'],
	['(truncate -7 2)', '-3'],
	['(round 2.5)', '2'],
	['(round 3.5)', '4'],
	['(round 7 2)', '4'],
	['(float 1/2)', '0.5'],
	['(gcd 12 18)', '6'],
	['(* 1.0 10000000)', '1.0e7'],
	['(/ 1.0 10000)', '1.0e-4'],
	['(* 99999999999 99999999999)', '9999999999800000000001'],
	// Conditionals and logic
	['(if t 1 2)', '1'],
	['(if nil 1 2)', '2'],
	['(if nil 1)', 'NIL'],
	["(if '() 'yes 'no)", 'NO'],
	["(if 0 'yes 'no)", 'YES'],
	['(cond ((= 1 2) 1) ((= 1 1) 2) (t 3))', '2'],
	['(cond ((= 1 2) 1))', 'NIL'],
	["(cond ((member 'b '(a b c))))", '(B C)'],
	["(cond (nil 1) (t (print 'x) 'done))", 'DONE'],
	['(case 2 (1 (quote one)) ((2 3) (quote two-or-three)) (t (quote other)))', 'TWO-OR-THREE'],
	["(case 'z (a 1) (otherwise 9))", '9'],
	["(case 'z (a 1))", 'NIL'],
	['(when (> 2 1) 1 2)', '2'],
	['(when nil 1)', 'NIL'],
	['(unless nil 1 2)', '2'],
	['(and 1 2 3)', '3'],
	['(and 1 nil 3)', 'NIL'],
	['(and)', 'T'],
	["(or nil 'a 'b)", 'A'],
	['(or nil nil)', 'NIL'],
	['(or)', 'NIL'],
	["(and nil (car 'a))", 'NIL'],
	['(progn 1 2 3)', '3'],
	['(progn)', 'NIL'],
	['(prog1 1 2 3)', '1'],
	// Variables
	['(let ((x 1) (y 2)) (+ x y))', '3'],
	['(let (x) x)', 'NIL'],
	['(let ((x 1)) (let ((x 2) (y x)) (list x y)))', '(2 1)'],
	['(let ((x 1)) (let* ((x 2) (y x)) (list x y)))', '(2 2)'],
	['(let ((x 1)) (setq x 5) x)', '5'],
	['(let ((x 1) (y 2)) (setq x 10 y 20))', '20'],
	['(let ((x 1)) (setf x (+ x 1)) x)', '2'],
	['(let ((n 5)) (incf n) (incf n 10) n)', '16'],
	['(let ((n 5)) (decf n 2))', '3'],
	["(let ((s '(b))) (push 'a s) s)", '(A B)'],
	["(let ((s '(a b))) (list (pop s) s))", '(A (B))'],
	['((lambda (x y) (* x y)) 3 4)', '12'],
	// Loops
	["(let ((sum 0)) (dolist (x '(1 2 3) sum) (setq sum (+ sum x))))", '6'],
	["(dolist (x '(1 2 3)))", 'NIL'],
	['(let ((acc nil)) (dotimes (i 3 acc) (push i acc)))', '(2 1 0)'],
	['(dotimes (i 4 i))', '4'],
	["(dolist (x '(1 2 3 4)) (when (> x 2) (return x)))", '3'],
	['(block outer (dotimes (i 10) (when (= i 3) (return-from outer (* i 10)))) 99)', '30'],
	// Higher-order functions
	["(mapcar #'1+ '(1 2 3))", '(2 3 4)'],
	["(mapcar #'(lambda (x) (* x x)) '(1 2 3))", '(1 4 9)'],
	["(mapcar (lambda (x) (* x 10)) '(1 2))", '(10 20)'],
	["(mapcar #'+ '(1 2 3) '(10 20))", '(11 22)'],
	["(mapcar #'list '(a b) '(1 2))", '((A 1) (B 2))'],
	["(mapcar #'car '((a b) (c d) (e)))", '(A C E)'],
	["(mapcar 'car '((a b) (c d)))", '(A C)'],
	["(funcall #'+ 1 2 3)", '6'],
	['(funcall (lambda (x) (* 2 x)) 21)', '42'],
	["(apply #'+ '(1 2 3))", '6'],
	["(apply #'+ 1 2 '(3 4))", '10'],
	["(apply #'max '(3 7 2))", '7'],
	["(reduce #'+ '(1 2 3 4))", '10'],
	["(reduce #'+ '())", '0'],
	["(reduce #'cons '(1 2 3) :initial-value nil)", '(((NIL . 1) . 2) . 3)'],
	["(every #'numberp '(1 2 3))", 'T'],
	["(every #'numberp '(1 a 3))", 'NIL'],
	["(some #'evenp '(1 3 4))", 'T'],
	["(some #'evenp '(1 3))", 'NIL'],
	["(identity 'x)", 'X'],
	["(eval '(+ 1 2))", '3'],
	["(eval (list '* 2 3))", '6'],
	// Output and strings
	['(format nil "~a and ~a" 1 "two")', '"1 and two"'],
	['(format nil "~s" "two")', '"\\"two\\""'],
	['(format nil "~d items" 3)', '"3 items"'],
	['(format nil "~a" \'(a "b"))', '"(A b)"'],
	['(format t "hi~%")', 'NIL'],
	['(print 3)', '3'],
	['(prin1 "x")', '"x"'],
	['(princ "x")', '"x"'],
	['(terpri)', 'NIL'],
	// Functions as values
	["#'car", '#<FUNCTION CAR>'],
	['(lambda (x) x)', '#<FUNCTION (LAMBDA (X))>'],
	['(function (lambda (a b) a))', '#<FUNCTION (LAMBDA (A B))>']
];

describe('Lisp evaluator golden results', () => {
	it.each(GOLDEN)('%s → %s', (input, expected) => {
		expect(results(input)).toEqual([expected]);
	});
});

describe('definitions, recursion and closures', () => {
	it('DEFUN returns the name and the function can be called', () => {
		expect(
			results(`(defun my-length (lst) (if (null lst) 0 (+ 1 (my-length (cdr lst)))))
(my-length '(a b c))
(my-length '())`)
		).toEqual(['MY-LENGTH', '3', '0']);
	});

	it('recursion on lists: summing, reversing, nested lists, flattening', () => {
		const code = `
(defun sum-list (lst) (if (null lst) 0 (+ (car lst) (sum-list (cdr lst)))))
(defun rev (lst) (if (null lst) nil (append (rev (cdr lst)) (list (car lst)))))
(defun count-atoms (x) (cond ((null x) 0) ((atom x) 1) (t (+ (count-atoms (car x)) (count-atoms (cdr x))))))
(defun flatten (x) (cond ((null x) nil) ((atom x) (list x)) (t (append (flatten (car x)) (flatten (cdr x))))))
(sum-list '(1 2 3 4))
(rev '(1 (2 3) 4))
(count-atoms '(a (b c) ((d)) nil e))
(flatten '(a (b (c d)) e))`;
		expect(results(code).slice(4)).toEqual(['10', '(4 (2 3) 1)', '5', '(A B C D E)']);
	});

	it('factorial uses integers of any size', () => {
		expect(last('(defun fact (n) (if (= n 0) 1 (* n (fact (- n 1))))) (fact 20)')).toBe(
			'2432902008176640000'
		);
		expect(last('(defun fact (n) (if (<= n 1) 1 (* n (fact (- n 1))))) (fact 30)')).toBe(
			'265252859812191058636308480000000'
		);
	});

	it('closures capture their lexical environment', () => {
		expect(
			results(`(defun make-adder (n) #'(lambda (x) (+ x n)))
(funcall (make-adder 10) 5)
(mapcar (make-adder 1) '(1 2 3))
(defvar *counter* (let ((count 0)) #'(lambda () (setq count (+ count 1)))))
(funcall *counter*)
(funcall *counter*)`)
		).toEqual(['MAKE-ADDER', '15', '(2 3 4)', '*COUNTER*', '1', '2']);
	});

	it('lexical scope: a function sees globals, not its caller’s locals', () => {
		expect(
			results(`(setq x 'global)
(defun show-x () x)
(let ((x 'local)) (show-x))`)
		).toEqual(['GLOBAL', 'SHOW-X', 'GLOBAL']);
	});

	it('DEFVAR variables are special: LET rebinds them dynamically', () => {
		expect(
			results(`(defvar *x* 1)
(defun get-x () *x*)
(let ((*x* 2)) (get-x))
(get-x)
(defvar *x* 99)
*x*
(defparameter *x* 5)
*x*`)
		).toEqual(['*X*', 'GET-X', '2', '1', '*X*', '1', '*X*', '5']);
	});

	it('&optional and &rest parameters', () => {
		expect(
			results(`(defun f (a &optional (b 10) c) (list a b c))
(f 1)
(f 1 2 3)
(defun g (a &rest more) (list a more))
(g 1 2 3)
(g 1)`)
		).toEqual(['F', '(1 10 NIL)', '(1 2 3)', 'G', '(1 (2 3))', '(1 NIL)']);
	});

	it('a documentation string is skipped; RETURN-FROM leaves the function', () => {
		expect(
			results(`(defun find-first-even (lst)
  "The first even number in LST."
  (dolist (x lst nil) (when (evenp x) (return-from find-first-even x))))
(find-first-even '(1 3 4 5 6))
(find-first-even '(1 3))`)
		).toEqual(['FIND-FIRST-EVEN', '4', 'NIL']);
	});

	it('output from PRINT and FORMAT is collected per form', () => {
		const r = evaluate(`(print 'a)
(format t "x = ~a~%" 5)
(progn (princ "a") (princ "b") (terpri) 'done)
(format t "~&one~&two")`);
		expect(r.forms.map((f) => f.output)).toEqual(['\nA ', 'x = 5\n', 'ab\n', 'one\ntwo']);
		expect(r.output).toBe('\nA x = 5\nab\none\ntwo');
	});

	it('TRACE and UNTRACE forms', () => {
		const r = evaluate(`(defun sq (x) (* x x))
(trace sq)
(sq 3)
(untrace sq)
(sq 4)`);
		expect(outcome(r)).toEqual(['SQ', '(SQ)', '9', 'T', '16']);
		expect(formatTrace(r.trace)).toBe('0: (SQ 3)\n0: SQ returned 9');
	});

	it('NIL is false and the empty list; anything else is true', () => {
		expect(results("(if nil 'a 'b) (if '() 'a 'b) (if 0 'a 'b) (eq nil '())")).toEqual([
			'B',
			'B',
			'A',
			'T'
		]);
	});
});

describe('errors in Common Lisp’s words', () => {
	it.each([
		["(car 'a)", 'The value A is not of type LIST.'],
		['(cdr 5)', 'The value 5 is not of type LIST.'],
		["(+ 'a 1)", 'The value A is not of type NUMBER.'],
		['(1+ "a")', 'The value "a" is not of type NUMBER.'],
		['(evenp 1.5)', 'The value 1.5 is not of type INTEGER.'],
		["(length 'a)", 'The value A is not of type SEQUENCE.'],
		["(length '(1 . 2))", 'The value 2 is not of type LIST.'],
		["(append 1 '(2))", 'The value 1 is not of type LIST.'],
		['foo', 'The variable FOO is unbound.'],
		['(foo 1)', 'The function FOO is undefined.'],
		['(car 1 2)', 'The function CAR is called with two arguments, but wants exactly one.'],
		['(cons 1)', 'The function CONS is called with one argument, but wants exactly two.'],
		['(/ 1 0)', 'Arithmetic error DIVISION-BY-ZERO signalled. Operation was (/ 1 0).'],
		['(mod 5 0)', 'Arithmetic error DIVISION-BY-ZERO signalled. Operation was (mod 5 0).'],
		["(funcall 'nope 1)", 'The function NOPE is undefined.'],
		['(funcall 3)', 'The value 3 is not of type (OR FUNCTION SYMBOL).'],
		[
			'(1 2 3)',
			"Illegal function call: (1 2 3). The first element must name a function; to use the list as data, quote it: '(1 2 3)."
		],
		['(if)', 'IF takes between two and three arguments, but (IF) has none.'],
		['(quote a b)', 'QUOTE takes exactly one argument, but (QUOTE A B) has two arguments.'],
		[
			'(setq x)',
			'SETQ needs pairs of a variable and a value, but (SETQ X) has an odd number of arguments.'
		],
		['(setq t 1)', 'T is a constant; you cannot assign to it.'],
		['(let ((nil 1)) nil)', 'NIL is a constant; you cannot bind it.'],
		['(setf (car x) 1)', 'SETF of (CAR X) is not supported; SETF works on variables only.'],
		[
			'(loop for x in nil)',
			'LOOP is not supported by this evaluator (see the reference for what is).'
		],
		['(return 1)', 'RETURN is only allowed inside DOLIST, DOTIMES or (BLOCK NIL …).'],
		['(sqrt -4)', '(SQRT -4) is a complex number; complex numbers are not supported.'],
		[
			'(defun length (x) x)',
			'Lock on package COMMON-LISP violated when defining LENGTH as a function: LENGTH is a built-in function. Use another name, such as MY-LENGTH.'
		],
		['(defun f (x x) x)', 'The variable X occurs more than once in the parameter list of DEFUN F.'],
		['(defun f (&key a) a)', '&KEY parameters are not supported (only &OPTIONAL and &REST).'],
		['(format nil "~a ~a" 1)', 'FORMAT: no more arguments for ~a in the control string "~a ~a".'],
		[
			'(format nil "~x" 1)',
			'FORMAT: the directive ~x is not supported (supported: ~A ~S ~D ~% ~& ~~).'
		],
		["(dolist (x 'a) x)", 'The value A is not of type LIST.'],
		["(dotimes (i 'a) i)", 'The value A is not of type INTEGER.'],
		['(cond x (t 1))', 'COND clause X is not a list of the form (test form …).']
	])('%s', (input, message) => {
		expect(results(input)).toEqual([`error: ${message}`]);
	});

	it('user functions check their argument count', () => {
		expect(results('(defun f (a b) a) (f 1) (f 1 2 3)')).toEqual([
			'F',
			'error: The function F is called with one argument, but wants exactly two.',
			'error: The function F is called with three arguments, but wants exactly two.'
		]);
		expect(results('((lambda (x) x))')).toEqual([
			'error: The function (LAMBDA (X)) is called with zero arguments, but wants exactly one.'
		]);
	});

	it('an error stops its form, not the run', () => {
		expect(results("(car 'a) (+ 1 2)")).toEqual(['error: The value A is not of type LIST.', '3']);
	});

	it('errors are located at the innermost form', () => {
		const code = '(defun f (x) (+ x (car x)))\n(f 5)';
		const r = evaluate(code);
		const err = r.forms[1].error!;
		expect(err.message).toBe('The value 5 is not of type LIST.');
		expect(code.slice(err.span!.start, err.span!.end)).toBe('(car x)');
		expect(r.diagnostics).toEqual([
			{ severity: 'error', message: 'The value 5 is not of type LIST.', span: err.span }
		]);
		const unbound = evaluate('(list 1 y)');
		expect(unbound.forms[0].error!.span).toEqual({ start: 8, end: 9, source: null });
		const undef = evaluate('(+ 1 (nope 2))');
		expect(undef.forms[0].error!.span).toEqual({ start: 6, end: 10, source: null });
	});

	it('spans carry the run’s source name', () => {
		const r = new Interpreter().run('(car 1)', { source: 'repl' });
		expect(r.forms[0].error!.span).toEqual({ start: 0, end: 7, source: 'repl' });
	});

	it('reading errors stop the run before evaluation', () => {
		const r = evaluate("(print 'a) (car '(1 2)");
		expect(r.read).toBe(false);
		expect(r.forms).toEqual([]);
		expect(r.diagnostics[0].message).toBe('This ( is never closed: one ) is missing.');
	});
});

describe('limits', () => {
	it('stops runaway recursion at the call-depth limit', () => {
		expect(DEFAULT_MAX_DEPTH).toBe(1000);
		const r = results(`(defun down (n) (if (= n 0) 0 (+ 1 (down (- n 1)))))
(down 998)
(down 999)
(down 1000)
(defun forever (n) (forever n))
(forever 1)`);
		// (down 999) makes 1,000 nested calls (n = 999 … 0).
		expect(r.slice(1, 4)).toEqual([
			'998',
			'999',
			'error: Control stack exhausted: more than 1,000 nested function calls — is the recursion missing a base case?'
		]);
		expect(r[5]).toBe(r[3]);
	});

	it('stops long computations at the step limit', () => {
		expect(DEFAULT_MAX_STEPS).toBe(200_000);
		const message =
			'error: Stopped after 200,000 evaluation steps — is the recursion missing a base case?';
		expect(results('(dotimes (i 1000000) i)')).toEqual([message]);
		expect(last('(defun fib (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) (fib 30)')).toBe(
			message
		);
		expect(results('(dotimes (i 100000000))')).toEqual([message]);
	});

	it('limits are configurable', () => {
		expect(results('(dotimes (i 100) i)', { maxSteps: 50 })).toEqual([
			'error: Stopped after 50 evaluation steps — is the recursion missing a base case?'
		]);
		expect(last('(defun d (n) (if (= n 0) 0 (d (- n 1)))) (d 10)')).toBe('0');
		expect(results('(defun d (n) (if (= n 0) 0 (d (- n 1)))) (d 10)', { maxDepth: 5 })[1]).toMatch(
			/more than 5 nested/
		);
	});

	it('each top-level form gets its own step budget', () => {
		const r = evaluate('(dotimes (i 30) i) (dotimes (i 30) i)', { maxSteps: 100 });
		expect(outcome(r)).toEqual(['NIL', 'NIL']);
		expect(r.forms[0].steps).toBeGreaterThan(30);
	});

	it('handles deeply nested code and data without JavaScript recursion limits', () => {
		const n = 20_000;
		const nested = `${'(+ 1 '.repeat(n)}0${')'.repeat(n)}`;
		expect(results(nested)).toEqual([String(n)]);
		const data = `'${'('.repeat(n)}${')'.repeat(n)}`;
		const r = evaluate(data);
		expect(r.forms[0].printed!.startsWith('((((')).toBe(true);
		expect(r.forms[0].printed!.length).toBeLessThan(3000);
		expect(results(`(defun f (x) (if (null x) 0 (+ 1 (f (car x))))) (f ${data})`)[1]).toMatch(
			/more than 1,000 nested function calls/
		);
		expect(results(`${'('.repeat(n)}${')'.repeat(n)}`)[0]).toMatch(/^error: Illegal function call/);
	});

	it('refuses integers that are too large', () => {
		expect(results('(expt 2 1000000)')[0]).toMatch(/^error: Integer too large/);
	});

	it('caps the output', () => {
		const r = evaluate('(dotimes (i 100) (princ "abcdefghij"))', { maxOutput: 50 });
		expect(r.outputTruncated).toBe(true);
		expect(r.output.startsWith('abcdefghij'.repeat(5))).toBe(true);
		expect(r.output).toMatch(/output stopped at 50 characters/);
	});
});

describe('lockedName', () => {
	it('names built-ins and special operators', () => {
		expect(lockedName('CAR')).toBe('a built-in function');
		expect(lockedName('IF')).toBe('a special operator');
		expect(lockedName('LOOP')).toBe('a Common Lisp operator');
		expect(lockedName('MY-LENGTH')).toBeNull();
	});
});

describe('Interpreter sessions', () => {
	it('keeps definitions between runs (the REPL)', () => {
		const lisp = new Interpreter();
		lisp.run('(defun twice (x) (* 2 x)) (defvar *n* 4)');
		expect(outcome(lisp.run('(twice *n*)', { source: 'repl' }))).toEqual(['8']);
		expect(lisp.userFunctions()).toEqual(['TWICE']);
	});

	it('records each form’s text, span and trace range', () => {
		const r = evaluate('(defun sq (x) (* x x))\n(sq 2) (sq 3)', { trace: true });
		expect(r.forms.map((f) => f.text)).toEqual(['(defun sq (x) (* x x))', '(sq 2)', '(sq 3)']);
		expect(r.forms.map((f) => [f.traceStart, f.traceEnd])).toEqual([
			[0, 0],
			[0, 2],
			[2, 4]
		]);
		expect(r.trace.map((t) => t.form)).toEqual([1, 1, 2, 2]);
	});
});
