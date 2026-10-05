/**
 * Exercises for the Lisp tool.
 *
 * - Interpret: a short program (definitions, possibly none) and one or more
 *   expressions; the printed result of each is typed in and checked. `answer`
 *   is the printed result Common Lisp gives (or `error` when the expression
 *   signals one); the spec checks every answer against the evaluator.
 * - Write: a function to define, a starter template, test calls with the
 *   expected printed value, and a reference solution (the spec checks that it
 *   passes its own tests). `forbid` lists built-ins the definition may not
 *   call; `require` lists ones it must call.
 *
 * Ids are stable: other pages link to them through LinkStates['lisp'].exercise.
 */

export type ExerciseMode = 'interpret' | 'write';

export interface InterpretPrompt {
	expr: string;
	/** The printed result, or `error`. */
	answer: string;
}

export interface InterpretExercise {
	id: string;
	mode: 'interpret';
	title: string;
	/** Definitions evaluated before the prompts ('' for none). */
	setup: string;
	prompts: InterpretPrompt[];
	/** A plain statement shown with the answers. */
	note: string;
}

export interface WriteTest {
	call: string;
	/** The printed value the call returns. */
	expected: string;
}

export interface WriteExercise {
	id: string;
	mode: 'write';
	title: string;
	/** The function to define, upper case. */
	name: string;
	description: string;
	starter: string;
	tests: WriteTest[];
	solution: string;
	/** Built-in functions the definition may not use. */
	forbid?: string[];
	/** Built-in functions the definition must use. */
	require?: string[];
}

export type Exercise = InterpretExercise | WriteExercise;

export const INTERPRET_EXERCISES: readonly InterpretExercise[] = [
	{
		id: 'read-car-cdr',
		mode: 'interpret',
		title: 'CAR and CDR chains',
		setup: '',
		prompts: [
			{ expr: "(car (cdr '(a b c d)))", answer: 'B' },
			{ expr: "(cdr (cdr '(a b c d)))", answer: '(C D)' },
			{ expr: "(car (car (cdr '((a b) (c d)))))", answer: 'C' },
			{ expr: "(cdr (car '((a b) (c d))))", answer: '(B)' }
		],
		note: 'CAR returns the first element of a list and CDR the list without its first element; nested calls apply from the inside out. (CADR x) is (CAR (CDR x)).'
	},
	{
		id: 'read-cons-list-append',
		mode: 'interpret',
		title: 'CONS, LIST and APPEND',
		setup: '',
		prompts: [
			{ expr: "(cons '(a) '(b c))", answer: '((A) B C)' },
			{ expr: "(list '(a) '(b c))", answer: '((A) (B C))' },
			{ expr: "(append '(a) '(b c))", answer: '(A B C)' }
		],
		note: 'CONS puts its first argument in front of the list it gets; LIST makes a new list whose elements are its arguments; APPEND joins the elements of its lists into one list.'
	},
	{
		id: 'read-dotted-pairs',
		mode: 'interpret',
		title: 'Dotted pairs',
		setup: '',
		prompts: [
			{ expr: "(cons 1 '(2))", answer: '(1 2)' },
			{ expr: "(list 1 '(2))", answer: '(1 (2))' },
			{ expr: '(cons 1 2)', answer: '(1 . 2)' },
			{ expr: "(append '(1) 2)", answer: '(1 . 2)' }
		],
		note: 'A cons whose CDR is not a list prints with a dot. APPEND copies all but its last argument and uses the last one as the tail, so a non-list last argument ends the result with a dot.'
	},
	{
		id: 'read-quote',
		mode: 'interpret',
		title: 'Quote and evaluation',
		setup: '',
		prompts: [
			{ expr: "(list 'a (+ 1 2) '(+ 1 2))", answer: '(A 3 (+ 1 2))' },
			{ expr: "(car '(+ 1 2))", answer: '+' },
			{ expr: "(car ''a)", answer: 'QUOTE' }
		],
		note: "A quoted expression is returned as data without being evaluated. 'x is short for (QUOTE x), so ''a is the list (QUOTE A), whose CAR is the symbol QUOTE."
	},
	{
		id: 'read-predicates',
		mode: 'interpret',
		title: 'MEMBER, AND, OR and NIL',
		setup: '',
		prompts: [
			{ expr: "(member 'c '(a b c d))", answer: '(C D)' },
			{ expr: '(and 1 2 3)', answer: '3' },
			{ expr: "(or nil 'a 'b)", answer: 'A' },
			{ expr: "(null '())", answer: 'T' }
		],
		note: 'Anything other than NIL counts as true. MEMBER returns the rest of the list starting at the element found; AND returns its last value when all are true; OR returns the first true value. () and NIL are the same object.'
	},
	{
		id: 'read-cond',
		mode: 'interpret',
		title: 'COND',
		setup: `(defun classify (x)
  (cond ((not (numberp x)) 'not-a-number)
        ((< x 0) 'negative)
        ((= x 0) 'zero)
        (t 'positive)))`,
		prompts: [
			{ expr: '(classify -5)', answer: 'NEGATIVE' },
			{ expr: '(classify 0)', answer: 'ZERO' },
			{ expr: "(classify 'ten)", answer: 'NOT-A-NUMBER' },
			{ expr: '(list (classify 3) (classify "3"))', answer: '(POSITIVE NOT-A-NUMBER)' }
		],
		note: 'COND tries its clauses in order and evaluates the body of the first clause whose test is true; T as the last test catches everything else.'
	},
	{
		id: 'read-count-items',
		mode: 'interpret',
		title: 'Recursion: counting elements',
		setup: `(defun count-items (lst)
  (if (null lst)
      0
      (+ 1 (count-items (cdr lst)))))`,
		prompts: [
			{ expr: "(count-items '(a b c))", answer: '3' },
			{ expr: "(count-items '(a (b c) d))", answer: '3' },
			{ expr: "(count-items '(()))", answer: '1' }
		],
		note: 'The recursion follows the CDRs, so it counts top-level elements: a nested list, and NIL inside a list, each count as one element.'
	},
	{
		id: 'read-sum-positives',
		mode: 'interpret',
		title: 'Recursion: summing with a condition',
		setup: `(defun sum-pos (lst)
  (cond ((null lst) 0)
        ((plusp (car lst)) (+ (car lst) (sum-pos (cdr lst))))
        (t (sum-pos (cdr lst)))))`,
		prompts: [
			{ expr: "(sum-pos '(3 -2 5 0 -1 4))", answer: '12' },
			{ expr: "(sum-pos '(-1 -2))", answer: '0' }
		],
		note: 'Positive elements are added to the sum of the rest; zero and negative ones are skipped. The empty list sums to 0.'
	},
	{
		id: 'read-reverse',
		mode: 'interpret',
		title: 'Recursion: building a list',
		setup: `(defun rev (lst)
  (if (null lst)
      nil
      (append (rev (cdr lst)) (list (car lst)))))

(defun double-all (lst)
  (if (null lst)
      nil
      (cons (* 2 (car lst)) (double-all (cdr lst)))))`,
		prompts: [
			{ expr: "(rev '(1 2 3))", answer: '(3 2 1)' },
			{ expr: "(rev '(1 (2 3) 4))", answer: '(4 (2 3) 1)' },
			{ expr: "(double-all '(1 2 3))", answer: '(2 4 6)' }
		],
		note: 'REV appends the reversed rest to a one-element list of the first element; nested lists are elements and are not reversed themselves. DOUBLE-ALL conses each doubled element onto the result for the rest.'
	},
	{
		id: 'read-nested-lists',
		mode: 'interpret',
		title: 'Recursion on nested lists',
		setup: `(defun count-atoms (x)
  (cond ((null x) 0)
        ((atom x) 1)
        (t (+ (count-atoms (car x))
              (count-atoms (cdr x))))))

(defun depth (x)
  (if (atom x)
      0
      (max (+ 1 (depth (car x)))
           (depth (cdr x)))))`,
		prompts: [
			{ expr: "(count-atoms '(a (b c) ((d))))", answer: '4' },
			{ expr: "(count-atoms '(a nil b))", answer: '2' },
			{ expr: "(depth '(a (b (c)) d))", answer: '3' }
		],
		note: 'Both functions recur on the CAR and the CDR, so they reach every level of nesting. COUNT-ATOMS checks NULL before ATOM, so NIL elements count 0.'
	},
	{
		id: 'read-mapcar',
		mode: 'interpret',
		title: 'MAPCAR and LAMBDA',
		setup: '',
		prompts: [
			{ expr: "(mapcar #'1+ '(1 2 3))", answer: '(2 3 4)' },
			{ expr: "(mapcar #'(lambda (x) (* x x)) '(1 2 3))", answer: '(1 4 9)' },
			{ expr: "(mapcar #'list '(a b c) '(1 2 3))", answer: '((A 1) (B 2) (C 3))' },
			{ expr: "(mapcar #'car '((a b) (c d) (e)))", answer: '(A C E)' }
		],
		note: 'MAPCAR calls the function on each element (or on corresponding elements of several lists) and returns the list of results.'
	},
	{
		id: 'read-let',
		mode: 'interpret',
		title: 'LET versus LET*',
		setup: '',
		prompts: [
			{ expr: '(let ((x 1)) (let ((x 2) (y x)) (list x y)))', answer: '(2 1)' },
			{ expr: '(let ((x 1)) (let* ((x 2) (y x)) (list x y)))', answer: '(2 2)' },
			{ expr: '(let ((x 5)) (setq x (* x 2)) (+ x 1))', answer: '11' }
		],
		note: 'LET evaluates all initial values before binding any variable, so (y x) sees the outer x. LET* binds one variable at a time, so (y x) sees the new x.'
	},
	{
		id: 'read-closures',
		mode: 'interpret',
		title: 'Functions as values',
		setup: `(defun make-adder (n)
  #'(lambda (x) (+ x n)))

(defun apply-twice (f x)
  (funcall f (funcall f x)))`,
		prompts: [
			{ expr: '(funcall (make-adder 10) 5)', answer: '15' },
			{ expr: '(apply-twice (make-adder 3) 1)', answer: '7' },
			{ expr: "(apply-twice #'cdr '(a b c d))", answer: '(C D)' }
		],
		note: "MAKE-ADDER returns a closure that keeps the N it was made with. FUNCALL calls a function value; #' gives the function named by a symbol."
	},
	{
		id: 'read-accumulator',
		mode: 'interpret',
		title: 'A helper with an accumulator',
		setup: `(defun rev-acc (lst acc)
  (if (null lst)
      acc
      (rev-acc (cdr lst) (cons (car lst) acc))))`,
		prompts: [
			{ expr: "(rev-acc '(a b c) nil)", answer: '(C B A)' },
			{ expr: "(rev-acc '(1 2) '(x y))", answer: '(2 1 X Y)' }
		],
		note: 'Each call moves the first element of LST onto the front of ACC; when LST is empty the accumulated list is the result.'
	},
	{
		id: 'read-print',
		mode: 'interpret',
		title: 'PRINT versus the returned value',
		setup: `(defun noisy-square (x)
  (print x)
  (* x x))`,
		prompts: [
			{ expr: '(noisy-square 3)', answer: '9' },
			{ expr: '(+ (print 1) (print 2))', answer: '3' }
		],
		note: 'PRINT writes its argument as output and returns it; the result of a call is the value of the last form in the body.'
	},
	{
		id: 'read-errors',
		mode: 'interpret',
		title: 'Value or error?',
		setup: '',
		prompts: [
			{ expr: '(car nil)', answer: 'NIL' },
			{ expr: "(car 'a)", answer: 'error' },
			{ expr: "(cdr '(a))", answer: 'NIL' },
			{ expr: "(+ 'a 1)", answer: 'error' },
			{ expr: "(nth 3 '(a b c))", answer: 'NIL' }
		],
		note: 'CAR and CDR of NIL are NIL, and NTH past the end is NIL; CAR of a symbol and + of a symbol are type errors.'
	}
];

export const WRITE_EXERCISES: readonly WriteExercise[] = [
	{
		id: 'write-my-length',
		mode: 'write',
		title: 'Length of a list',
		name: 'MY-LENGTH',
		description: 'Define (my-length lst): the number of top-level elements in LST, without LENGTH.',
		starter: '(defun my-length (lst)\n  nil)',
		tests: [
			{ call: "(my-length '())", expected: '0' },
			{ call: "(my-length '(a b c))", expected: '3' },
			{ call: "(my-length '((a b) c))", expected: '2' },
			{ call: "(my-length '(nil nil))", expected: '2' }
		],
		solution: `(defun my-length (lst)
  (if (null lst)
      0
      (+ 1 (my-length (cdr lst)))))`,
		forbid: ['LENGTH']
	},
	{
		id: 'write-sum-list',
		mode: 'write',
		title: 'Sum of a list',
		name: 'SUM-LIST',
		description: 'Define (sum-list lst): the sum of the numbers in LST (0 for the empty list).',
		starter: '(defun sum-list (lst)\n  nil)',
		tests: [
			{ call: "(sum-list '())", expected: '0' },
			{ call: "(sum-list '(1 2 3))", expected: '6' },
			{ call: "(sum-list '(5 -2 10))", expected: '13' },
			{ call: "(sum-list '(1.5 2))", expected: '3.5' }
		],
		solution: `(defun sum-list (lst)
  (if (null lst)
      0
      (+ (car lst) (sum-list (cdr lst)))))`,
		forbid: ['APPLY', 'REDUCE']
	},
	{
		id: 'write-factorial',
		mode: 'write',
		title: 'Factorial',
		name: 'FACTORIAL',
		description: 'Define (factorial n): n! = 1 · 2 · … · n for a whole number n ≥ 0, with 0! = 1.',
		starter: '(defun factorial (n)\n  nil)',
		tests: [
			{ call: '(factorial 0)', expected: '1' },
			{ call: '(factorial 1)', expected: '1' },
			{ call: '(factorial 5)', expected: '120' },
			{ call: '(factorial 10)', expected: '3628800' },
			{ call: '(factorial 20)', expected: '2432902008176640000' }
		],
		solution: `(defun factorial (n)
  (if (= n 0)
      1
      (* n (factorial (- n 1)))))`
	},
	{
		id: 'write-fibonacci',
		mode: 'write',
		title: 'Fibonacci numbers',
		name: 'FIBONACCI',
		description:
			'Define (fibonacci n): the nth Fibonacci number, where (fibonacci 0) is 0, (fibonacci 1) is 1, and each later one is the sum of the two before it.',
		starter: '(defun fibonacci (n)\n  nil)',
		tests: [
			{ call: '(fibonacci 0)', expected: '0' },
			{ call: '(fibonacci 1)', expected: '1' },
			{ call: '(fibonacci 2)', expected: '1' },
			{ call: '(fibonacci 7)', expected: '13' },
			{ call: '(fibonacci 15)', expected: '610' }
		],
		solution: `(defun fibonacci (n)
  (if (< n 2)
      n
      (+ (fibonacci (- n 1)) (fibonacci (- n 2)))))`
	},
	{
		id: 'write-my-reverse',
		mode: 'write',
		title: 'Reverse a list',
		name: 'MY-REVERSE',
		description:
			'Define (my-reverse lst): the top-level elements of LST in reverse order, without REVERSE. Nested lists stay as they are.',
		starter: '(defun my-reverse (lst)\n  nil)',
		tests: [
			{ call: "(my-reverse '())", expected: 'NIL' },
			{ call: "(my-reverse '(a b c))", expected: '(C B A)' },
			{ call: "(my-reverse '(1 (2 3) 4))", expected: '(4 (2 3) 1)' }
		],
		solution: `(defun my-reverse (lst)
  (if (null lst)
      nil
      (append (my-reverse (cdr lst)) (list (car lst)))))`,
		forbid: ['REVERSE', 'NREVERSE']
	},
	{
		id: 'write-my-member',
		mode: 'write',
		title: 'Membership',
		name: 'MY-MEMBER',
		description:
			'Define (my-member item lst): like MEMBER, the rest of LST starting at the first element EQL to ITEM, or NIL when there is none. Without MEMBER.',
		starter: '(defun my-member (item lst)\n  nil)',
		tests: [
			{ call: "(my-member 'c '(a b c d))", expected: '(C D)' },
			{ call: "(my-member 'z '(a b))", expected: 'NIL' },
			{ call: "(my-member 'a '())", expected: 'NIL' },
			{ call: "(my-member 3 '(1 2 3))", expected: '(3)' }
		],
		solution: `(defun my-member (item lst)
  (cond ((null lst) nil)
        ((eql item (car lst)) lst)
        (t (my-member item (cdr lst)))))`,
		forbid: ['MEMBER']
	},
	{
		id: 'write-last-element',
		mode: 'write',
		title: 'Last element',
		name: 'LAST-ELEMENT',
		description:
			'Define (last-element lst): the last element of LST, or NIL for the empty list. Without LAST.',
		starter: '(defun last-element (lst)\n  nil)',
		tests: [
			{ call: "(last-element '(a b c))", expected: 'C' },
			{ call: "(last-element '(x))", expected: 'X' },
			{ call: "(last-element '(a (b c)))", expected: '(B C)' },
			{ call: "(last-element '())", expected: 'NIL' }
		],
		solution: `(defun last-element (lst)
  (if (null (cdr lst))
      (car lst)
      (last-element (cdr lst))))`,
		forbid: ['LAST']
	},
	{
		id: 'write-remove-all',
		mode: 'write',
		title: 'Remove every occurrence',
		name: 'REMOVE-ALL',
		description:
			'Define (remove-all item lst): LST without the top-level elements EQL to ITEM. Without REMOVE.',
		starter: '(defun remove-all (item lst)\n  nil)',
		tests: [
			{ call: "(remove-all 'a '(a b a c))", expected: '(B C)' },
			{ call: "(remove-all 'z '(a b))", expected: '(A B)' },
			{ call: "(remove-all 'a '(a a))", expected: 'NIL' },
			{ call: "(remove-all 1 '())", expected: 'NIL' }
		],
		solution: `(defun remove-all (item lst)
  (cond ((null lst) nil)
        ((eql item (car lst)) (remove-all item (cdr lst)))
        (t (cons (car lst) (remove-all item (cdr lst))))))`,
		forbid: ['REMOVE', 'REMOVE-IF', 'REMOVE-IF-NOT']
	},
	{
		id: 'write-count-occurrences',
		mode: 'write',
		title: 'Count occurrences',
		name: 'COUNT-OCCURRENCES',
		description:
			'Define (count-occurrences item lst): how many top-level elements of LST are EQL to ITEM.',
		starter: '(defun count-occurrences (item lst)\n  nil)',
		tests: [
			{ call: "(count-occurrences 'a '(a b a c a))", expected: '3' },
			{ call: "(count-occurrences 'z '(a b))", expected: '0' },
			{ call: "(count-occurrences 'a '((a) a))", expected: '1' },
			{ call: "(count-occurrences 2 '())", expected: '0' }
		],
		solution: `(defun count-occurrences (item lst)
  (cond ((null lst) 0)
        ((eql item (car lst)) (+ 1 (count-occurrences item (cdr lst))))
        (t (count-occurrences item (cdr lst)))))`
	},
	{
		id: 'write-square-all',
		mode: 'write',
		title: 'Square every element (MAPCAR)',
		name: 'SQUARE-ALL',
		description:
			'Define (square-all lst) with MAPCAR: the list of the squares of the numbers in LST.',
		starter: '(defun square-all (lst)\n  nil)',
		tests: [
			{ call: "(square-all '(1 2 3))", expected: '(1 4 9)' },
			{ call: "(square-all '())", expected: 'NIL' },
			{ call: "(square-all '(-2 0.5))", expected: '(4 0.25)' }
		],
		solution: `(defun square-all (lst)
  (mapcar #'(lambda (x) (* x x)) lst))`,
		require: ['MAPCAR']
	},
	{
		id: 'write-max-list',
		mode: 'write',
		title: 'Largest element',
		name: 'MAX-LIST',
		description:
			'Define (max-list lst): the largest number in the non-empty list LST, without APPLY or REDUCE.',
		starter: '(defun max-list (lst)\n  nil)',
		tests: [
			{ call: "(max-list '(3 9 2))", expected: '9' },
			{ call: "(max-list '(-5))", expected: '-5' },
			{ call: "(max-list '(-3 -1 -2))", expected: '-1' },
			{ call: "(max-list '(1 2.5 2))", expected: '2.5' }
		],
		solution: `(defun max-list (lst)
  (if (null (cdr lst))
      (car lst)
      (max (car lst) (max-list (cdr lst)))))`,
		forbid: ['APPLY', 'REDUCE']
	},
	{
		id: 'write-count-atoms',
		mode: 'write',
		title: 'Count atoms in a nested list',
		name: 'COUNT-ATOMS',
		description:
			'Define (count-atoms x): the number of atoms (other than NIL) at any depth of the nested list X.',
		starter: '(defun count-atoms (x)\n  nil)',
		tests: [
			{ call: "(count-atoms '(a (b c) ((d))))", expected: '4' },
			{ call: "(count-atoms '())", expected: '0' },
			{ call: "(count-atoms '(((a))))", expected: '1' },
			{ call: "(count-atoms '((a b) (c (d e))))", expected: '5' }
		],
		solution: `(defun count-atoms (x)
  (cond ((null x) 0)
        ((atom x) 1)
        (t (+ (count-atoms (car x))
              (count-atoms (cdr x))))))`
	},
	{
		id: 'write-flatten',
		mode: 'write',
		title: 'Flatten a nested list',
		name: 'FLATTEN',
		description:
			'Define (flatten x): the atoms of the nested list X, left to right, in one flat list.',
		starter: '(defun flatten (x)\n  nil)',
		tests: [
			{ call: "(flatten '(a (b (c d)) e))", expected: '(A B C D E)' },
			{ call: "(flatten '())", expected: 'NIL' },
			{ call: "(flatten '(((a))))", expected: '(A)' },
			{ call: "(flatten '(a b))", expected: '(A B)' }
		],
		solution: `(defun flatten (x)
  (cond ((null x) nil)
        ((atom x) (list x))
        (t (append (flatten (car x))
                   (flatten (cdr x))))))`
	},
	{
		id: 'write-insert-sorted',
		mode: 'write',
		title: 'Insert into a sorted list',
		name: 'INSERT-SORTED',
		description:
			'Define (insert-sorted n lst): the list of numbers LST, sorted in increasing order, with N inserted at its place. Without SORT.',
		starter: '(defun insert-sorted (n lst)\n  nil)',
		tests: [
			{ call: "(insert-sorted 4 '(1 3 5 7))", expected: '(1 3 4 5 7)' },
			{ call: "(insert-sorted 0 '(1 2))", expected: '(0 1 2)' },
			{ call: "(insert-sorted 9 '())", expected: '(9)' },
			{ call: "(insert-sorted 9 '(1 2))", expected: '(1 2 9)' }
		],
		solution: `(defun insert-sorted (n lst)
  (cond ((null lst) (list n))
        ((<= n (car lst)) (cons n lst))
        (t (cons (car lst) (insert-sorted n (cdr lst))))))`,
		forbid: ['SORT']
	},
	{
		id: 'write-my-append',
		mode: 'write',
		title: 'Append two lists',
		name: 'MY-APPEND',
		description:
			'Define (my-append a b): the elements of list A followed by the elements of list B, without APPEND.',
		starter: '(defun my-append (a b)\n  nil)',
		tests: [
			{ call: "(my-append '(a b) '(c d))", expected: '(A B C D)' },
			{ call: "(my-append '() '(x))", expected: '(X)' },
			{ call: "(my-append '(1) '())", expected: '(1)' },
			{ call: "(my-append '(1 2) '((3)))", expected: '(1 2 (3))' }
		],
		solution: `(defun my-append (a b)
  (if (null a)
      b
      (cons (car a) (my-append (cdr a) b))))`,
		forbid: ['APPEND', 'NCONC']
	}
];

export const EXERCISES: readonly Exercise[] = [...INTERPRET_EXERCISES, ...WRITE_EXERCISES];

export function exerciseById(id: string): Exercise | undefined {
	return EXERCISES.find((e) => e.id === id);
}

export function exercisesFor(mode: ExerciseMode): readonly Exercise[] {
	return mode === 'interpret' ? INTERPRET_EXERCISES : WRITE_EXERCISES;
}
