import mongoose from "mongoose"


const subjectGradeSchema = new mongoose.Schema({
    subjectCode: {type: String, required: true},
    subjectName: {type: String, default: "N/A"},
    gradePoint: {type: Number, required: true},
    letterGrade: {type: String, required: true}

})


//! Our Student Model

const studentSchema = new mongoose.Schema({
    scholarId: {type: String, required: true, unique: true},
    department: {type: String, required: true},
    subjects: [subjectGradeSchema],
    gp: {type: Number, required: true},
    sgpa: {type: Number, required: true},
    cgpa: {type: Number, required: true}
})

const Student = mongoose.model('Student', studentSchema)
export default Student;