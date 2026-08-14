# jsdoc-to-d-ts

## Index
1. [Installation](#installation)
2. [Usage](#usage)
3. [Examples](#examples)

## Installation

```console
npm install --save-dev jsdoc-to-d-ts
```

## Usage

```console
Usage: jsdoc-to-d-ts [options] [file]

lightweight transpiler to convert javascript with jsdoc to typescript's .d.ts files

Arguments:
  file                    transpiles a single file

Options:
  -v, --version           output the version number
  -p, --project [config]  the path of the tsconfig.json file of the project to transpile
  -h, --help              display help for command
```

## Examples

### Abstract classes

#### Javascript file

```javascript
/**
 * An abstract class.
 * 
 * @abstract
 */
export default class Vehicle {
    /**
     * Creates a new vehicle.
     * 
     * @param {number} mileage - The initial mileage of the vehicle.
     */
    constructor (mileage) {
        /**
         * The total mileage of the vehicle.
         * 
         * @protected
         * @type {number}
         */
        this._mileage = mileage
    }

    /**
     * A concrete method.
     * 
     * @returns {number} The total mileage of the vehicle.
     */
    get mileage() {
        return this._mileage;
    }

    /**
     * An abstract method.
     * 
     * @abstract
     * @param {number} miles - The number of miles to drive. 
     */
    drive(miles) {
        throw new Error("Method 'drive(miles)' is not implemented.");
    }
}
```

#### jsdoc-to-d-ts

```typescript
/**
 * An abstract class.
 * 
 * @abstract
 */
export default abstract class Vehicle {
    /**
     * The total mileage of the vehicle.
     * 
     * @protected
     * @type {number}
     */
    protected _mileage: number;
    /**
     * Creates a new vehicle.
     * 
     * @param {number} mileage - The initial mileage of the vehicle.
     */
    constructor(mileage: number);
    /**
     * A concrete method.
     * 
     * @returns {number} The total mileage of the vehicle.
     */
    get mileage(): any;
    /**
     * An abstract method.
     * 
     * @abstract
     * @param {number} miles - The number of miles to drive. 
     */
    abstract drive(miles: number): any;
}
```

#### tsc

```typescript
/**
 * An abstract class.
 *
 * @abstract
 */
export default class Vehicle {
    /**
     * Creates a new vehicle.
     *
     * @param {number} mileage - The initial mileage of the vehicle.
     */
    constructor(mileage: number);
    /**
     * The total mileage of the vehicle.
     *
     * @protected
     * @type {number}
     */
    protected _mileage: number;
    /**
     * A concrete method.
     *
     * @returns {number} The total mileage of the vehicle.
     */
    get mileage(): number;
    /**
     * An abstract method.
     *
     * @abstract
     * @param {number} miles - The number of miles to drive.
     */
    drive(miles: number): void;
}
```

### Internals

#### Javascript file

```javascript
/**
 * @typedef {Object} Student
 * @property {string} name - The student's name.
 * @property {Date} dateOfBirth - The student's date of birth.
 * @property {Date} [dateOfGraduation] - The student's date of graduation.
 * @property {"Computer science" | "Chemistry" | "Physics" | "Economics"} faculty - The student's faculty.
 */

/**
 * Fetches students from the DB.
 * 
 * @internal
 * @param {Query} [query] - An optional query to filter students.
 * @returns {Student[]} A list of students.
 */
export async function fetchStudents(query) {
    [...]
}
```

#### jsdoc-to-d-ts

```typescript
export type Student = {
    /*
     * The student's name.
     */
    name: string;
    /*
     * The student's date of birth.
     */
    dateOfBirth: Date;
    /*
     * The student's date of graduation.
     */
    dateOfGraduation?: Date;
    /*
     * The student's faculty.
     */
    faculty: "Computer science" | "Chemistry" | "Physics" | "Economics";
};
```

#### tsc

```typescript
/**
 * Fetches students from the DB.
 *
 * @internal
 * @param {Query} [query] - An optional query to filter students.
 * @returns {Student[]} A list of students.
 */
export function fetchStudents(query?: Query): Student[];
export type Student = {
    /**
     * - The student's name.
     */
    name: string;
    /**
     * - The student's date of birth.
     */
    dateOfBirth: Date;
    /**
     * - The student's date of graduation.
     */
    dateOfGraduation?: Date;
    /**
     * - The student's faculty.
     */
    faculty: "Computer science" | "Chemistry" | "Physics" | "Economics";
};
```

### Enumerations

#### Javascript file

```javascript
/**
 * Enum for fruits.
 * 
 * @enum {string}
 */
export const Fruit = {
    APPLE: "APPLE",
    PEAR: "PEAR",
    BANANA: "BANANA"
};
```

#### jsdoc-to-d-ts

```typescript
/**
 * Enum for fruits.
 * 
 * @enum {string}
 */
export enum Fruit {
    APPLE = "APPLE",
    PEAR = "PEAR",
    BANANA = "BANANA"
}
```

#### tsc

```typescript
/**
 * Enum for fruits.
 */
export type Fruit = string;
export namespace Fruit {
    let APPLE: string;
    let PEAR: string;
    let BANANA: string;
}
```


