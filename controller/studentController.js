import Student from "../model/student.js"

// rendering the home page
export const getSearchPage = (req,res) => {
    res.render("index", { title: "Search Results"})
}

// Fetch Student data and render the glass card profile
export const getStudentResult = async (req,res) => {
try{
const scholarId = req.query.scholarId; // holding the query parameter into scholarId variable
if(!scholarId){
    return res.render("index", {
        error: "Please provide a valid Scholar Id"
    })
}


// student data is found and saved in this variable
 const studentData = await Student.findOne({
    scholarId: scholarId.trim()

}
)

if(!studentData){
    return res.render("index",
        { error: 'No student with this ScholarId is found'}
    )
}

// Debug: Log the student data being passed
console.log('Student Data:', {
    scholarId: studentData.scholarId,
    department: studentData.department,
    gp: studentData.gp
});
console.log('Full studentData object:', JSON.stringify(studentData, null, 2));
console.log('studentData type:', typeof studentData);
console.log('studentData keys:', Object.keys(studentData));

// render the result view and pass the database object into it
res.render('result',{ student: studentData});

} catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error")
}



}