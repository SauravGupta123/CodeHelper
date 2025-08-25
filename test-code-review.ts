// Test file for code review functionality
// This file contains intentional issues for testing

function calculateTotal(items: any[], discount: number): number {
  // Bug: No null check for items
  let total = 0;
  
  // Performance: Inefficient loop
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  // Security: No input validation
  if (discount > 100) {
    discount = 100; // This could cause issues
  }
  
  // Clarity: Poor variable naming and no documentation
  const result = total - (total * discount / 100);
  
  return result;
}

// Bug: Potential undefined access
function getUserName(user: any): string {
  return user.name; // No null check
}

// Performance: Inefficient array operations
function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  
  return duplicates;
}

// Security: SQL injection vulnerability
function getUserById(id: string): string {
  const query = `SELECT * FROM users WHERE id = ${id}`; // Vulnerable
  return query;
}

// Clarity: Complex function with poor structure
function processData(data: any[], config: any, options: any): any[] {
  let processed = [];
  let temp = [];
  let final = [];
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].value && data[i].value > config.threshold) {
      temp.push(data[i]);
    }
  }
  
  for (let j = 0; j < temp.length; j++) {
    if (options.filter && options.filter(temp[j])) {
      final.push(temp[j]);
    } else if (!options.filter) {
      final.push(temp[j]);
    }
  }
  
  return final;
}

