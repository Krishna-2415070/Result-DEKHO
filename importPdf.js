import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// IMPORTANT: Node.js ES6 requires the .js extension for local files
import Student from './model/student.js'; 

dotenv.config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

// Reconstruct __dirname for ES6 environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard NIT Silchar Grade-to-Point Map
const gradeScale = { 
    'AA': 10, 'AB': 9, 'BB': 8, 'BC': 7, 'CC': 6, 'CD': 5, 'DD': 4, 'F': 0, 'I': 0 
};

// Helper: Fixes messy decimal point typos (e.g., "5,79" -> 5.79, "9:29" -> 9.29, "814" -> 8.14)
function parseGPA(val) {
    if (!val) return 0;
    let clean = val.trim().replace(/,/g, '.').replace(/:/g, '.');
    let num = parseFloat(clean);
    if (num > 10) num = num / 100; // Fixes dropped decimals like 814 to 8.14
    return isNaN(num) ? 0 : num;
}

async function startUniversalImport() {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nitResults');
        console.log('📦 Connected to MongoDB safely (ES6 Mode)...');

        // 2. Read the Provisional PDF using reconstructed __dirname
        const pdfBuffer = fs.readFileSync(path.join(__dirname, 'b-tech-4th-sem-provisional-result-2024-entry-batch-except-cse.pdf'));
        const pdfParser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
        const pdfData = await pdfParser.getText();
        const lines = pdfData.text.split('\n');
        
        let currentDept = 'Unknown';
        let currentSubjects = []; // Dynamically populated per department section
        const recordsToInsert = [];

        console.log('⚡ Scanning PDF pages dynamically across all engineering branches...');

        for (let line of lines) {
            // A. Catch Department transitions
            if (line.includes('Department:')) {
                const match = line.match(/Department:\s*([A-Z&\s]+)/);
                if (match) {
                    currentDept = match[1].trim();
                    console.log(`\n🏢 Found Department: [${currentDept}]`);
                }
                continue;
            }

            // B. Dynamic Header Detector: Extract subject codes straight from the table headers
            if (line.includes('Regn. No.') || line.includes('Sino')) {
                const cleanHeaderLine = line.replace(/[\r\n]/g, ' ');
                const discoveredCodes = cleanHeaderLine.match(/[A-Z]{2}\s+\d{3}/g) || [];
                
                if (discoveredCodes.length > 0) {
                    currentSubjects = discoveredCodes;
                    console.log(`   📚 Auto-detected 9 Subjects: ${currentSubjects.join(', ')}`);
                }
                continue;
            }

            // C. Process Student Rows
            const trimmedLine = line.trim();
            const tokens = trimmedLine.split(/\s+/).filter(Boolean);
            
            // A valid student row starts with or contains a 7-digit Registration/Scholar ID
            const regNo = tokens.find(token => /^2\d{6}$/.test(token));
            
            if (regNo && currentSubjects.length > 0) {
                // The last 3 items in a student row are always GP, SGPA, and CGPA
                const totalGP = parseFloat(tokens[tokens.length - 3]) || 0;
                const sgpa = parseGPA(tokens[tokens.length - 2]);
                const cgpa = parseGPA(tokens[tokens.length - 1]);

                // Isolate the middle tokens containing the actual grade data
                const regIndex = tokens.indexOf(regNo);
                const middleTokens = tokens.slice(regIndex + 1, tokens.length - 3);

                // Self-Correcting Grade Filter: Extract only the valid letter grades
                const validGradesInRow = middleTokens.filter(token => Object.keys(gradeScale).includes(token.toUpperCase()));

                // Map the extracted grades to our dynamic subject codes
                const studentSubjects = [];
                currentSubjects.forEach((subjectCode, index) => {
                    const letterGrade = validGradesInRow[index] || 'N/A';
                    const gradePoint = gradeScale[letterGrade.toUpperCase()] || 0;

                    studentSubjects.push({
                        subjectCode: subjectCode,
                        subjectName: 'Engineering Core',
                        gradePoint: gradePoint,
                        letterGrade: letterGrade
                    });
                });

                recordsToInsert.push({
                    scholarId: regNo,
                    department: currentDept,
                    subjects: studentSubjects,
                    gp: totalGP,
                    sgpa: sgpa,
                    cgpa: cgpa
                });
            }
        }

        // 3. Clear existing data and execute bulk database insert
        if (recordsToInsert.length > 0) {
            await Student.deleteMany({});
            await Student.insertMany(recordsToInsert);
            console.log(`\n🚀 SUCCESS: Imported ${recordsToInsert.length} total students across ALL branches into MongoDB!`);
        } else {
            console.log('⚠️ Critical: No student records parsed. Check file placement.');
        }

    } catch (err) {
        console.error('❌ Data migration terminated:', err);
    } finally {
        mongoose.connection.close();
    }
}

startUniversalImport();