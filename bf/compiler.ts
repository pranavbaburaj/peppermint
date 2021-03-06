import {mkdir, writeFile} from 'fs';
import {join} from 'path';
import {cwd} from 'process';
import {PepperMintException} from '../src/exceptions/exception';
import {LexerPosition} from '../src/lang/position';
import {Instruction, parse} from './bf';

// the print statements in the bf code
interface Logs {
  // the current cell value when the print
  // statement was called
  currentValue: number;
}

interface CompilerOutput {
  // The files in which the compiled long
  // code should be stored
  // The file = <cwd> / dist / <filename>
  filename?: Array<string>;

  // the compiled output
  compiled: string;
}

/**
 * @constant
 *
 * Stores the compiled code into dist files
 *
 * @param {CompilerOutput} output The compiler output interface object
 * containing the output files and the compiled code
 */
const createLongOutput = (output: CompilerOutput): void => {
  const filenames: Array<string> = output.filename
    ? output.filename
    : new Array('compiled');
  const directory = join(cwd(), 'dist');
  mkdir(directory, (err: NodeJS.ErrnoException | null) => {
    if (err) {
      const exception = new PepperMintException({
        message: `Cannot create dist folder in ${cwd()}`,
        suggestion: 'Try deleting the dist directory',
      }).throwException(true);
    }

    for (let index = 0; index < filenames.length; index++) {
      writeFile(
        join(directory, `${filenames[index]}.long`),
        output.compiled,
        (error: NodeJS.ErrnoException | null) => {
          if (error) {
            const exception = new PepperMintException({
              message: 'Unable to write compiled file',
            }).throwException(true);
          }
        }
      );
    }
  });
};

export class BfLongCompiler {
  private source: string;
  private tokens: Array<Instruction>;
  private position: LexerPosition = new LexerPosition(0);

  private longTokens: Array<any> = new Array(1).fill(0);
  private longLogs: Array<Logs> = new Array();
  private longIndex: number = 0;

  /**
   * @constructor
   * @param {string} source The source code
   */
  constructor(source: string) {
    this.source = source;
    this.tokens = parse(this.source);

    this.convertLong();
  }

  /**
   * @private
   *
   * The main process
   */
  private convertLong = (): void | null => {
    let character: Instruction | null = this.position.currentCharacter(
      this.tokens
    );
    while (character != null) {
      const command = this.createTokens(character);

      this.position.increment(1);
      character = this.position.currentCharacter(this.tokens);
    }

    createLongOutput({
      filename: ['test'],
      compiled: this.createCompiledString(this.longLogs),
    });
  };

  /**
   * @private
   *
   * Returns the compiled form of brainfuck(in long)
   *
   * @param logs All the print statements
   * @returns {string} The compiled output
   */
  private createCompiledString = (logs: Array<Logs>): string => {
    let compiled: string = '';
    let value = 0;
    for (let logIndex = 0; logIndex < logs.length; logIndex++) {
      const current = logs[logIndex];
      const difference = current.currentValue - value;
      value = current.currentValue;

      if (difference < 0) {
        compiled += `${Math.abs(difference)}-`;
      } else {
        compiled += `${difference}+`;
      }
    }

    return compiled;
  };

  /**
   * @private
   *
   * Add specific tokens to the token  list
   *
   * @param character The current character or instruction
   */
  private createTokens = (character: Instruction | null): void => {
    if (character == '+') {
      this.longTokens[this.longIndex] += 1;
    } else if (character == '-') {
      this.longTokens[this.longIndex] -= 1;
    } else if (character == '<') {
      if (this.longIndex != 0) {
        this.longIndex -= 1;
      }
    } else if (character == '>') {
      this.longIndex += 1;
      if (!this.longTokens[this.longIndex]) {
        this.longTokens[this.longIndex] = 0;
      }
    } else if (character == '.') {
      this.longLogs.push({
        currentValue: this.longTokens[this.longIndex],
      });
    }
  };
}
