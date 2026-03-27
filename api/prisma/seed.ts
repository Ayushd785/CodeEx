import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Clear existing data (in correct order due to foreign keys)
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  // Seed Problem 1: Two Sum
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

## Example
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

## Input Format
- First line: space-separated integers (the array)
- Second line: the target integer

## Output Format
- Two space-separated indices (0-indexed)`,
      difficulty: Difficulty.EASY,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      testCases: {
        create: [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', isSample: true },
          { input: '3 2 4\n6', expectedOutput: '1 2', isSample: true },
          { input: '3 3\n6', expectedOutput: '0 1', isSample: false },
          { input: '1 5 3 7 2\n9', expectedOutput: '1 3', isSample: false },
        ],
      },
    },
  });

  // Seed Problem 2: FizzBuzz
  const fizzBuzz = await prisma.problem.create({
    data: {
      title: 'FizzBuzz',
      description: `Write a program that prints the numbers from 1 to n. But for multiples of three, print "Fizz" instead of the number, and for multiples of five, print "Buzz". For numbers which are multiples of both three and five, print "FizzBuzz".

## Example
\`\`\`
Input: 15
Output:
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
\`\`\`

## Input Format
- A single integer n (1 <= n <= 100)

## Output Format
- Print each number or word on a new line`,
      difficulty: Difficulty.EASY,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz', isSample: true },
          { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', isSample: false },
          { input: '3', expectedOutput: '1\n2\nFizz', isSample: false },
        ],
      },
    },
  });

  // Seed Problem 3: Reverse String (Medium)
  const reverseString = await prisma.problem.create({
    data: {
      title: 'Reverse Words in a String',
      description: `Given an input string s, reverse the order of the words.

A word is defined as a sequence of non-space characters. The words in s will be separated by at least one space.

Return a string of the words in reverse order concatenated by a single space.

## Example
\`\`\`
Input: "the sky is blue"
Output: "blue is sky the"
\`\`\`

## Input Format
- A single line containing the string

## Output Format
- The reversed string`,
      difficulty: Difficulty.MEDIUM,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: {
        create: [
          { input: 'the sky is blue', expectedOutput: 'blue is sky the', isSample: true },
          { input: 'hello world', expectedOutput: 'world hello', isSample: true },
          { input: 'a', expectedOutput: 'a', isSample: false },
        ],
      },
    },
  });

  console.log('Seeded problems:');
  console.log(`  - ${twoSum.title} (${twoSum.id})`);
  console.log(`  - ${fizzBuzz.title} (${fizzBuzz.id})`);
  console.log(`  - ${reverseString.title} (${reverseString.id})`);
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });