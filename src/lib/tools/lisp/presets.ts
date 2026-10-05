/**
 * Example programs for the Lisp tool's editor. There are no Lisp lecture
 * slides, so the presets cite nothing; they follow standard Common Lisp.
 */
import type { Preset } from '$lib/components/ui/types';

export interface LispProgram {
	code: string;
}

const program = (
	id: string,
	group: string,
	label: string,
	description: string,
	code: string
): Preset<LispProgram> => ({ id, group, label, description, value: { code: code.trim() + '\n' } });

export const LISP_PRESETS: readonly Preset<LispProgram>[] = [
	program(
		'factorial',
		'Recursion',
		'Factorial',
		'A recursive factorial, called on a few numbers; integers have no size limit.',
		`
;; n! = n * (n-1)!, with 0! = 1
(defun fact (n)
  (if (= n 0)
      1
      (* n (fact (- n 1)))))

(fact 3)
(fact 20)
(mapcar #'fact '(0 1 2 3 4 5))
`
	),
	program(
		'list-recursion',
		'Recursion',
		'Length, sum and reverse',
		'Recursive functions that walk a list with CAR and CDR.',
		`
(defun my-length (lst)
  (if (null lst)
      0
      (+ 1 (my-length (cdr lst)))))

(defun sum-list (lst)
  (if (null lst)
      0
      (+ (car lst) (sum-list (cdr lst)))))

(defun my-reverse (lst)
  (if (null lst)
      nil
      (append (my-reverse (cdr lst)) (list (car lst)))))

(my-length '(a b c d))
(sum-list '(1 2 3 4))
(my-reverse '(1 2 3 4))
`
	),
	program(
		'nested-lists',
		'Recursion',
		'Nested lists',
		'Functions that recur on both the CAR and the CDR to reach every level of a nested list.',
		`
(defun count-atoms (x)
  (cond ((null x) 0)
        ((atom x) 1)
        (t (+ (count-atoms (car x))
              (count-atoms (cdr x))))))

(defun flatten (x)
  (cond ((null x) nil)
        ((atom x) (list x))
        (t (append (flatten (car x))
                   (flatten (cdr x))))))

(count-atoms '(a (b c) ((d)) e))
(flatten '(a (b (c d)) ((e))))
`
	),
	program(
		'fibonacci',
		'Recursion',
		'Fibonacci (two recursive calls)',
		'Tree recursion: each call makes two more, so the number of calls grows quickly.',
		`
(defun fib (n)
  (if (< n 2)
      n
      (+ (fib (- n 1)) (fib (- n 2)))))

(fib 4)
(mapcar #'fib '(0 1 2 3 4 5 6 7 8 9 10))
`
	),
	program(
		'list-basics',
		'Lists',
		'CAR, CDR, CONS, LIST, APPEND',
		'The basic list operations and how their results print.',
		`
(car '(a b c))
(cdr '(a b c))
(cadr '(a b c))
(cons 'a '(b c))
(cons '(a) '(b c))
(list 'a '(b c))
(append '(a) '(b c))
(cons 1 2)
(append '(1) 2)
(list 'a (+ 1 2) '(+ 1 2))
`
	),
	program(
		'alists',
		'Lists',
		'Association lists',
		'A list of (key . value) pairs looked up with ASSOC.',
		`
(defparameter *ages* '((ann . 31) (bob . 25) (cy . 40)))

(assoc 'bob *ages*)
(cdr (assoc 'cy *ages*))
(assoc 'dee *ages*)

(defun older-than (n alist)
  (cond ((null alist) nil)
        ((> (cdr (car alist)) n)
         (cons (car (car alist)) (older-than n (cdr alist))))
        (t (older-than n (cdr alist)))))

(older-than 30 *ages*)
`
	),
	program(
		'higher-order',
		'Functions',
		'MAPCAR, LAMBDA, FUNCALL, APPLY',
		"Functions passed as arguments: #' names a function, LAMBDA makes one.",
		`
(mapcar #'1+ '(1 2 3))
(mapcar #'(lambda (x) (* x x)) '(1 2 3 4))
(mapcar #'+ '(1 2 3) '(10 20 30))
(funcall #'* 2 3 4)
(apply #'max '(3 9 2))
(remove-if #'evenp '(1 2 3 4 5 6))
(reduce #'+ '(1 2 3 4 5))
`
	),
	program(
		'closures',
		'Functions',
		'Closures',
		'Functions that keep the variables they were created with.',
		`
(defun make-adder (n)
  #'(lambda (x) (+ x n)))

(defparameter *add5* (make-adder 5))
(funcall *add5* 10)
(mapcar (make-adder 100) '(1 2 3))

(defun make-counter ()
  (let ((count 0))
    #'(lambda () (setq count (+ count 1)))))

(defparameter *c* (make-counter))
(funcall *c*)
(funcall *c*)
(funcall *c*)
`
	),
	program(
		'let',
		'Variables and loops',
		'LET and LET*',
		'Local variables: LET binds in parallel, LET* one after another.',
		`
(let ((x 1) (y 2))
  (+ x y))

(let ((x 1))
  (let ((x 2) (y x))
    (list x y)))

(let ((x 1))
  (let* ((x 2) (y x))
    (list x y)))

(setq total 0)
(setq total (+ total 5))
total
`
	),
	program(
		'loops',
		'Variables and loops',
		'DOLIST and DOTIMES',
		'Iteration over a list and over a range of integers.',
		`
(let ((sum 0))
  (dolist (x '(1 2 3 4) sum)
    (setq sum (+ sum x))))

(let ((squares nil))
  (dotimes (i 5 (reverse squares))
    (push (* i i) squares)))

(dolist (word '(one two three))
  (print word))
`
	),
	program(
		'output',
		'Output',
		'PRINT and FORMAT',
		'Output written while evaluating, and the values returned.',
		`
(print 'hello)
(print "a string")
(format t "~a plus ~a is ~a~%" 2 3 (+ 2 3))
(format nil "~s and ~a" "quoted" "plain")

(defun show-squares (n)
  (dotimes (i n)
    (format t "~d squared is ~d~%" i (* i i))))

(show-squares 4)
`
	),
	program(
		'errors',
		'Errors and limits',
		'Errors',
		'Each form signals an error; the message and its location are shown.',
		`
(car 'a)
(+ 1 'two)
(undefined-function 3)
unbound-variable
(car '(a b) '(c))
(/ 10 0)
(1 2 3)
`
	),
	program(
		'runaway',
		'Errors and limits',
		'Missing base case',
		'Recursion without a base case stops at the call-depth limit.',
		`
;; The base case is missing: (count-down 0) calls (count-down -1), …
(defun count-down (n)
  (+ 1 (count-down (- n 1))))

(count-down 3)
`
	)
];

export const DEFAULT_PRESET = LISP_PRESETS[0];

/** The preset whose code is exactly `code`, if any. */
export function matchPreset(code: string): Preset<LispProgram> | null {
	return LISP_PRESETS.find((p) => p.value.code === code) ?? null;
}
