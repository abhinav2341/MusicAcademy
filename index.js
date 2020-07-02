const functions = require('firebase-functions');
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
app.use(express.urlencoded());
app.set('view engine', 'ejs');
app.use(cookieParser());
const admin = require("firebase-admin");
const serviceAccount = require("./music-academy-2341-firebase-adminsdk-892kc-f67c67fdce.json");

const firebase = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://music-academy-2341.firebaseio.com"
});

const db = admin.firestore();
let FieldValue = admin.firestore.FieldValue;

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
app.get('/', (req, res) => {
    let courseRef = db.collection('Courses');
    var liveCourses = [];
    var data = {};
    courseRef.where('status', '==', 'live').limit(10).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                data.LiveCourses = [];
                return;
            }
            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
                var courseInfo = {
                    courseid: doc.id,
                    courseInfo: doc.data()
                };
                // console.log('status ' + doc.data().status);
                liveCourses.push(courseInfo);
            });
            data.LiveCourses = liveCourses;
            console.log("DATA------->" + JSON.stringify(data));
            res.render('index.ejs', data);
            return;
        }).catch(err => {
            console.log("Error getting Courses " + err);
        });
    // res.render('index.ejs');
});

app.post('/signup2', (req, res) => {
    const email = req.body.signupEmail;
    const password = req.body.signupPass;
    const role = req.body.role;
    // res.send(email + " " + password + " " + role);
    let UsersCollectionsRef = db.collection('UsersCollections');
    const data = {
        email: email,
        password: password,
        role: role
    };
    UsersCollectionsRef.add(data).then(ref => {
            console.log('Added User document with ID: ', ref);
            // res.render("course.ejs");
            return res.redirect('/');
        })
        .catch(err => {
            console.log("error Adding Document in UserCollections Collection" + err);
        });
});

app.post('/login2', (req, res) => {
    var email = req.body.LoginEmail;
    var password = req.body.LoginPassword;
    console.log(email + " ------ " + password)
    let UsersCollectionsRef = db.collection('UsersCollections');
    let userId;
    // let role;
    UsersCollectionsRef.where('email', '==', email).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No matching documents.');
                return res.send('not a user yet in Plz Sign up');
            }

            snapshot.forEach(doc => {
                console.log(doc.id, '=>', doc.data());
                // res.send(doc.id + '=>' + doc.data());
                userId = doc.id;
                // role = doc.data().role;
                var userpass = doc.data().password;
                if (password === userpass)
                    return userId;
                else
                    return res.send('wrong password');
            });
            return;
        })
        .then(() => {
            admin.auth().createCustomToken(userId) //, additionalClaims)
                .then((customToken) => {
                    // Send token back to client
                    console.log("CT---- " + customToken);
                    var data = {
                        customToken: customToken
                            //role: role
                    };
                    return res.render("test.ejs", data);
                })
                .catch((error) => {
                    console.log('Error creating custom token:', error);
                });
            return;
        })
        .catch(err => {
            console.log('Error getting user documents', err);
        });
});

app.get('/profile', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        let user = db.collection('UsersCollections').doc(uid);
        user.get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    // console.log(doc);
                    const userInfo = doc.data();
                    var fName = "";
                    var lName = "";
                    var email = "";
                    var profilePicUrl = "";
                    var role = "";
                    if (userInfo.firstName !== undefined) {
                        fName = userInfo.firstName;
                    }
                    if (userInfo.lastName !== undefined) {
                        lName = userInfo.lastName;
                    }
                    if (userInfo.email !== undefined) {
                        email = userInfo.email;
                    }
                    if (userInfo.profilePicUrl !== undefined) {
                        profilePicUrl = userInfo.profilePicUrl;
                    }
                    if (userInfo.role !== undefined) {
                        role = userInfo.role;
                    }
                    const metadata = {
                            uid: uid,
                            firstName: fName,
                            lastName: lName,
                            email: email,
                            profilePicUrl: profilePicUrl,
                            role: role.toLowerCase()
                        }
                        // res.cookie("__session", metadata);
                    console.log("DATA   " + JSON.stringify(metadata));
                    return res.render('profile.ejs', metadata);
                }
            })
            .catch(err => {
                console.log('Error getting document', err);
            });
    } else {
        res.redirect("/");
    }
});

app.post('/updateprofile', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        let user = db.collection('UsersCollections').doc(uid);
        let data = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email
        }
        user.update(data)
            .then(() => {
                console.log("Profile Updated");
                return res.redirect("/profile");
            }).catch(err => {
                console.log('Error Updating Profile' + err);
            });
    } else {
        res.redirect("/");
    }
});

app.post('/uploadprofilepic', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        let user = db.collection('UsersCollections').doc(uid);
        let data = {
            profilePicUrl: req.body.profilePicUrl
        }
        user.update(data)
            .then(() => {
                console.log("Profile Updated");
                return res.redirect("/profile");
            }).catch(err => {
                console.log('Error Updating Profile' + err);
            });
    } else {
        res.redirect("/");
    }
});

app.post('/changepassword', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        const passwordDb = req.cookies.__session.userInfo.password;
        const currentPasswordForm = req.body.CurrentPassword;
        const NewPasswordForm = req.body.NewPassword;
        if (currentPasswordForm === passwordDb) {
            let user = db.collection('UsersCollections').doc(uid);
            let data = {
                password: NewPasswordForm
            }
            user.update(data)
                .then(() => {
                    console.log("Password Updated");
                    return res.redirect("/profile");
                }).catch(err => {
                    console.log('Error Updating Password' + err);
                });
        } else {
            res.send("Wrong Password");
        }
    } else {
        res.redirect("/");
    }
});

app.post('/signup', (req, res) => {
    // console.log(req.body.signupEmail + ' ' + req.body.signupPass + ' ' + req.body.role);
    console.log("node called");

    admin.auth().createUser({
            email: req.body.signupEmail,
            password: req.body.signupPass,
        })
        .then((userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            return res.render('UserRole.ejs');
        })
        .catch((error) => {
            console.log('Error creating new user:', error);
            if (error.code === 'auth/email-already-exists')
                res.send('account present');
        });

});

app.post('/login', (req, res) => {
    // res.send('page from login');
    const uid = req.body.uid;
    let user = db.collection('UsersCollections').doc(uid);
    user.get()
        .then(doc => {
            if (!doc.exists) {
                console.log('No such document!');
                return;
            } else {
                console.log('Document data:', doc.data());
                // console.log(doc);
                const userInfo = doc.data();
                const metadata = {
                    uid: uid,
                    userInfo: userInfo
                }
                res.cookie("__session", metadata);
                var role = userInfo.role;
                if (role === "Student") {
                    if (!userInfo.firstName)
                        return res.redirect('/profile');
                    else
                        return res.redirect('/student');
                } else {
                    if (!userInfo.firstName)
                        return res.redirect('/profile');
                    else
                        return res.redirect('/instructor');
                }
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
        });
});

app.get('/logout', (req, res) => {
    res.clearCookie('__session');
    return res.redirect('/');
});

app.get('/student', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        let user = db.collection('UsersCollections').doc(uid);
        let userdata = user.get().then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    // console.log(doc);
                    const userInfo = doc.data();
                    const metadata = {
                            uid: uid,
                            userInfo: userInfo
                        }
                        // res.cookie("__session", metadata);
                    var data = {}
                    data.userData = metadata;
                    return data;
                }

            })
            .catch(err => {
                console.log('Error getting document', err);
            });
        var enrolledCoursesId = [];
        let enrolledCourseDataPromise = userdata.then((data) => {
            console.log("Enrolled Course Data Promise**********");
            let enrolledCoursesRef = db.collection("UsersCollections").doc(uid).collection("Courses");
            enrolledCoursesRef.get().then(snapshot => {
                if (snapshot.empty) {
                    console.log('No enrolled course documents.');
                    return null;
                }
                snapshot.forEach(doc => {
                    console.log(doc.id, '=>', doc.data());
                    // res.send(doc.id + '=>' + doc.data());
                    enrollmentId = doc.id;
                    // role = doc.data().role;
                    var courseId = doc.data().courseid;
                    enrolledCoursesId.push(courseId);
                });
                return enrolledCoursesId;
            }).then(enrolledCoursesId => {
                if (enrolledCoursesId === null)
                    return [];
                var enrolledCourses = [];
                enrolledCoursesId.forEach(id => {
                    let courseRef = db.collection('Courses');
                    courseRef.doc(id).get().then(course => {
                            if (!course.exists) {
                                console.log('No Course document!');
                                return null;
                            } else {
                                console.log('Document data:', course.data());
                                var enrolledCourse = {
                                    courseid: course.id,
                                    courseInfo: course.data()
                                };
                                return enrolledCourse;
                            }
                        }).then(enrolledCourse => {
                            if (enrolledCourse)
                                enrolledCourses.push(enrolledCourse);
                            return;
                        })
                        .catch(err => {
                            console.log('Error getting document', err);
                        });
                });
                return enrolledCourses;
            }).then(enrolledCourses => {
                data.enrolledCourses = enrolledCourses;
                console.log("data from EnrolledCoursePromise " + JSON.stringify(data));
                return data;
            }).then((data) => {
                console.log("data to courseDataPromise " + JSON.stringify(data));
                console.log("EnrolledCoursesID Array " + JSON.stringify(enrolledCoursesId));
                let courseRef = db.collection('Courses');
                let courseData = courseRef.where("status", "==", "live").get()
                    .then(snapshot => {
                        if (snapshot.empty) {
                            console.log('No matching documents.');
                            // var data = {
                            //     userData: userdata,
                            // }
                            // return data;
                            data.courses = [];
                            res.render('./Student/student.ejs', data);
                            // return;
                        }
                        let courses = [];
                        snapshot.forEach(doc => {
                            console.log(doc.id, '=>', doc.data());
                            if (!enrolledCoursesId.includes(doc.id)) {
                                var courseInfo = {
                                        courseid: doc.id,
                                        courseInfo: doc.data()
                                    }
                                    // console.log('status ' + doc.data().status);
                                courses.push(courseInfo);
                            }
                        });
                        // console.log("pendingCourses " + pendingCourses);
                        // console.log("liveCourses " + liveCourses);
                        // var data = {
                        //     userData: userdata,
                        //     courses: courses
                        // }
                        data.courses = courses;
                        console.log("-------------> " + JSON.stringify(data));
                        console.log("last");
                        console.log("DATA ------->" + JSON.stringify(data));
                        res.render('./Student/student.ejs', data);
                        return;
                    })
                    .catch(err => {
                        console.log('Error getting documents', err);
                    });
                return;
            }).catch(err => {
                console.log(err);
            })
            return;
        }).catch(err => {
            console.log(err);
        })

        // let courseDataPromise = enrolledCourseDataPromise
        // courseDataPromise.then(coursdataPromise => {

        //     coursedataPromise.then(data => {
        //         console.log("last");
        //         console.log("DATA ------->" + JSON.stringify(data));
        //         res.render('./Student/student.ejs', data);
        //     });
        // });
    } else {
        res.redirect("/");
    }
});

app.get('/instructor', (req, res) => {
    if (req.cookies.__session) {
        const uid = req.cookies.__session.uid;
        var data = {};
        let user = db.collection('UsersCollections').doc(uid);
        let UserDataPromise = user.get().then(doc => {
            if (!doc.exists) {
                console.log('No such document!');
                return;
            } else {
                console.log('Document data:', doc.data());
                // console.log(doc);
                const userInfo = doc.data();
                data = {
                        uid: uid,
                        userInfo: userInfo
                    }
                    // res.cookie("__session", metadata);
                return;
            }
        }).catch(err => {
            console.log('Error getting document', err);
        });
        UserDataPromise.then(() => {
            let instructorCoursesRef = db.collection('Courses');
            var liveCourses = [];
            instructorCoursesRef.where('uid', '==', uid).where('status', '==', 'live').get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        console.log('No matching documents.');
                        data.LiveCourses = [];
                        // res.redirect('/instructormycourse')
                        res.render('instructor.ejs', data);
                        return;
                    }
                    snapshot.forEach(doc => {
                        console.log(doc.id, '=>', doc.data());
                        var courseInfo = {
                            courseid: doc.id,
                            courseInfo: doc.data()
                        };
                        console.log('status ' + doc.data().status);
                        liveCourses.push(courseInfo);
                    });
                    data.LiveCourses = liveCourses;
                    console.log("DATA------->" + JSON.stringify(data));
                    res.render('instructor.ejs', data);
                    return;
                }).catch(err => {
                    console.log("Error getting Courses " + err);
                });
            return;
        }).catch(err => {
            console.log(err);
        });
    } else {
        res.redirect("/");
    }
});

app.get('/registerstudent/:email', (req, res) => {
    // const metadata = {
    //     Email: req.params.email
    // }
    const email = req.params.email;
    admin.auth().getUserByEmail(email)
        .then((userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully fetched user data:', userRecord.toJSON());
            const userinfo = userRecord.toJSON();
            const data = {
                uid: userinfo.uid,
                email: userinfo.email,
                role: 'student'
            }
            db.collection('UsersCollections').doc(userinfo.uid).set(data);
            console.log("db add success");
            return res.render('index.ejs');
        })
        .catch((error) => {
            console.log('Error fetching user data:', error);
        });
    // console.log(req.params.email);

    // res.send(req.params.email);
    // res.render('UserRole.ejs', metadata);
});

app.get('/registerinstructor/:email', (req, res) => {
    // const metadata = {
    //     Email: req.params.email
    // }
    const email = req.params.email;
    admin.auth().getUserByEmail(email)
        .then((userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully fetched user data:', userRecord.toJSON());
            const userinfo = userRecord.toJSON();
            const data = {
                uid: userinfo.uid,
                email: userinfo.email,
                role: 'instructor'
            }
            db.collection('UsersCollections').doc(userinfo.uid).set(data);
            console.log("db add success");
            return res.render('index.ejs');
        })
        .catch((error) => {
            console.log('Error fetching user data:', error);
        });
    // console.log(req.params.email);

    // res.send(req.params.email);
    // res.render('UserRole.ejs', metadata);
});

app.get('/userrole/:email', (req, res) => {
    const metadata = {
        Email: req.params.email
    }
    res.render('UserRole.ejs', metadata);
});


app.get('/createcourse', (req, res) => {
    // console.log(" ------------> " + req.cookies.user.uid);
    // res.send('add course for' + req.cookies);
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        console.log("MetaData " + JSON.stringify(metadata));
        return res.render('createcourse.ejs', metadata);
    } else {
        res.redirect("/");
    }
});

app.get('/instructormycourse', (req, res) => {
    // console.log(" ------------> " + req.cookies.user.uid);
    // res.send('add course for' + req.cookies);
    // where('state', '==', 'CO').where('name', '==', 'Denver');
    console.log('instructormycourse Route----------- ');
    if (!req.cookies.__session) {
        res.redirect("/");
    } else {
        const metadata = req.cookies.__session;
        var liveCourses = [];
        var pendingCourses = [];
        let instructorCoursesRef = db.collection('Courses');
        console.log('MetaData From instructormycourse Route ' + JSON.stringify(metadata));
        instructorCoursesRef.where('uid', '==', metadata.uid).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log('No matching documents.');
                    return res.send("No Course Created Yet...");
                }

                snapshot.forEach(doc => {
                    console.log(doc.id, '=>', doc.data());
                    var courseInfo = {
                        courseid: doc.id,
                        courseInfo: doc.data()
                    }
                    console.log('status ' + doc.data().status);
                    if (doc.data().status !== null) {
                        if (doc.data().status === 'pending')
                            pendingCourses.push(courseInfo);
                        else
                            liveCourses.push(courseInfo);
                    }
                });
                // console.log("pendingCourses " + pendingCourses);
                // console.log("liveCourses " + liveCourses);
                var data = {
                    LiveCourses: liveCourses,
                    PendingCourses: pendingCourses,
                    User: metadata
                }
                console.log("-------------> " + JSON.stringify(data));
                return res.render('instructormycourse.ejs', data);
            })
            .catch(err => {
                console.log('Error getting documents', err);
            });
    }
});

app.post('/createcoursedb', (req, res) => {
    // console.log(" ------------> " + req.cookies.user.uid);
    // res.send('add course for' + req.cookies);
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        let instructorCoursesRef = db.collection('Courses');
        const formdata = req.body;
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        console.log("META DATA FROM CREATE COURSE DB ROUTE " + JSON.stringify(metadata));
        // var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const Coursedata = {
            uid: metadata.uid,
            courseName: formdata.CourseName,
            instructorName: formdata.InstructorName,
            courseDescription: formdata.CourseDescription,
            coursePrerequisite: formdata.CoursePrerequisite,
            courseDuration: formdata.CourseDuration,
            coursePrice: formdata.CoursePrice,
            courseDifficulty: formdata.CourseDifficulty,
            courseLanguage: formdata.CourseLanguage,
            courseCreated: date,
            courselastUpdated: date,
            timestamp: FieldValue.serverTimestamp(),
            status: 'pending'
        }
        instructorCoursesRef.add(Coursedata).then(ref => {
            console.log('Added course with ID: ' + ref.id);
            return;
        }).catch(err => {
            console.log('Error Adding course  ' + err);
        });
        // console.log("params " + req.body); //JSON.stringify(req.files));
        // res.send(req.body);
        res.render('instructor.ejs', metadata);
    } else {
        res.redirect("/");
    }
});

//Adding course thumbnail to DB
app.post("/addcoursethumbnaildb/:courseid", (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const thumbnailUrl = req.body.thumbnailUrl;
        let instructorCoursesRef = db.collection('Courses');
        var data = {
            courseThumbnailUrl: thumbnailUrl
        };
        instructorCoursesRef.doc(courseid).update(data)
            .then(() => {
                console.log("InstructorCourse updated");
                return res.redirect("/addlesson/" + courseid);
            }).catch(err => {
                console.log('Error Updating Course Doc' + err);
            });
        // res.send(thumbnailUrl + " " + courseid);
    } else {
        res.redirect("/");
    }
});

//Edit Course Route
app.post('/editcoursedb', (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        let instructorCoursesRef = db.collection('Courses');
        const formdata = req.body;
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        console.log("META DATA FROM CREATE COURSE DB ROUTE " + JSON.stringify(metadata));
        // var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var Coursedata = {
            courseName: formdata.CourseName,
            instructorName: formdata.InstructorName,
            courseDescription: formdata.CourseDescription,
            courseDuration: formdata.CourseDuration,
            coursePrice: formdata.CoursePrice,
            courseDifficulty: formdata.CourseDifficulty,
            courseLanguage: formdata.CourseLanguage,
            courselastUpdated: date
        };
        console.log("Course Data " + JSON.stringify(Coursedata))
        var courseid = formdata.CourseId;
        instructorCoursesRef.doc(courseid).update(Coursedata).then(() => {
            console.log('course updated .... ');
            res.redirect("/addlesson/" + courseid);
            return;
        }).catch(err => {
            console.log('Error updating course  ' + err);
        });

    } else {
        res.redirect("/");
    }
});

app.get('/addlesson/:courseid', (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        let instructorCoursesRef = db.collection('Courses');
        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        // console.log(courseid);
        let courseId;
        let courseInfo;
        let lessons = [];
        let data = {};
        let lectures = [];
        let lessonAllData = {};
        let lessonId = [];
        instructorCoursesRef.doc(courseid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    courseId = doc.id;
                    courseInfo = doc.data()
                    data = {
                        courseId: courseId,
                        courseInfo: courseInfo,
                        user: metadata
                    };
                    return;
                }
            })
            .then(() => {
                if (lessonsRef !== null) {
                    lessonsRef.orderBy('timestamp').get()
                        .then(snapshot => {
                            snapshot.forEach(lessondoc => {
                                console.log("lesson doc ");
                                console.log(lessondoc.id, '=>', lessondoc.data());

                                var lessonData = {
                                        lessonId: lessondoc.id,
                                        lessonInfo: lessondoc.data()
                                    }
                                    //lessonId.push(lessondoc.id);
                                lessons.push(lessonData);
                                return;
                                //console.log("TEMP LESSONS ARRAY" + JSON.stringify(templessons));
                            });
                            // console.log("LESSONS ARRAY-------" + JSON.stringify(lessons));
                            return;
                        })
                        .then(function() {
                            //console.log("FL-----" + JSON.stringify(finallessons));
                            data = Object.assign(data, { lessons: lessons });
                            console.log("DATA -------------> " + JSON.stringify(data));
                            return res.render("course.ejs", data);
                        })
                        .catch(err => {
                            console.log('Error getting lesson documents', err);
                        });
                } else {
                    // data = Object.assign({ lessons: [] }, data);
                }
                // data = Object.assign(data, { lessons: lessons });
                // console.log("DATA -------------> " + JSON.stringify(data));
                // res.render("course.ejs", data);
                return;
            })
            .catch(err => {
                console.log('Error getting course document', err);
            });
    } else {
        res.redirect("/");
    }

});


app.post('/addlessondb/:courseid', (req, res) => {

    // res.redirect('/addlesson/:courseid');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonName = req.body.LessonName;
        const noOfLectures = req.body.NumberOfLectures;
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');

        // console.log('fieldvalue' + JSON.stringify(FieldValue));
        const data = {
                lessonName: lessonName,
                noOfLectures: noOfLectures,
                lessonCreated: date,
                lessonLastUpdated: date,
                timestamp: FieldValue.serverTimestamp()
            }
            // let instructorCoursesRef = db.collection('Courses');

        lessonsRef.doc().set(data)
            .then(ref => {
                console.log('Added document with ID: ', ref);
                // res.render("course.ejs");
                return res.redirect('/addlesson/' + courseid);
            })
            .catch(err => {
                console.log("error Adding Document in Lectures Collection" + err);
            });
        // console.log(courseid);
        // res.send("AddlessonDb Route " + courseid + " " + metadata);

    } else {
        res.redirect("/");
    }
});

//Edit Lesson Route
app.post('/editlessondb/:courseid', (req, res) => {

    // res.redirect('/addlesson/:courseid');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonId = req.body.EditLessonId;
        const lessonName = req.body.EditLessonName;
        const noOfLectures = req.body.EditNumberOfLectures;
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();

        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        const data = {
            lessonName: lessonName,
            noOfLectures: noOfLectures,
            lessonLastUpdated: date,
        }
        lessonsRef.doc(lessonId).update(data)
            .then(() => {
                console.log('Lesson Updated... ');
                // res.render("course.ejs");
                return res.redirect('/addlesson/' + courseid);
            })
            .catch(err => {
                console.log("error Updating Lesson Doc" + err);
            });
    } else {
        res.redirect("/");
    }
});


app.get('/addlecture/:courseid/:lessonid', (req, res) => {
    console.log("********addlecture route*********");
    console.log(" ");
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonid = req.params.lessonid;
        // console.log("Meta Data Addlecture " + JSON.stringify(metadata));
        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        let instructorCoursesRef = db.collection('Courses');
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
        instructorCoursesRef.doc(courseid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    courseId = doc.id;
                    courseInfo = doc.data()

                    data = {
                        courseId: courseId,
                        courseInfo: courseInfo,
                        userId: metadata.uid,
                        userInfo: metadata.userInfo
                    };
                    return;
                }

            }).then(() => {
                lessonsRef.doc(lessonid).get()
                    .then(lessondoc => {
                        if (!lessondoc.exists) {
                            console.log('No such document!');
                            return;
                        } else {
                            console.log('lesson Document data:', lessondoc.data());
                            lessonId = lessondoc.id;
                            lessonInfo = lessondoc.data()
                            lesson = {
                                lessonId: lessonId,
                                lessonInfo: lessonInfo,
                            };
                            data = Object.assign(data, { lesson: lesson });
                            return data;
                        }
                    })
                    .then(function() {
                        console.log("Lesson DATA " + JSON.stringify(data));

                        // res.render("addlecture.ejs", data);
                        // let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
                        var lectures = [];
                        lectureRef.orderBy('timestamp').get()
                            .then(snapshot => {
                                snapshot.forEach(lecturedoc => {
                                    console.log("lesson doc ");
                                    console.log(lecturedoc.id, '=>', lecturedoc.data());
                                    lectures.push({
                                        lectureId: lecturedoc.id,
                                        lectureInfo: lecturedoc.data()
                                    })
                                });
                                // console.log("lectures" + lectures);
                                return;
                            })
                            .then(function() {
                                console.log("lectures" + lectures);
                                data = Object.assign(data, { lectures: lectures });
                                console.log("DATA------->" + JSON.stringify(data))
                                return res.render("addlecture.ejs", data);
                            })
                            .catch(err => {
                                console.log('Error getting lecture document', err);
                            });
                        return;
                    })
                    .catch(err => {
                        console.log('Error getting lesson document', err);
                    });
                return;
            })
            .catch(err => {
                console.log('Error getting Course document', err);
            });
    } else {
        res.redirect("/");
    }
});


app.post('/addlecturedb/:courseid', (req, res) => {

    // res.redirect('/test');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonId = req.body.LessonId;
        const lectureName = req.body.LectureName;
        const lectureDescription = req.body.LectureDescription;
        // res.send(lessonId + ' ' + lectureName + ' ' + lectureDescription);
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        const data = {
                lectureName: lectureName,
                lectureDescription: lectureDescription,
                lectureCreated: date,
                lectureLastUpdated: date,
                timestamp: FieldValue.serverTimestamp()
            }
            // let instructorCoursesRef = db.collection('Courses');
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonId).collection('Lectures');

        lectureRef.doc().set(data)
            .then(ref => {
                console.log('Added document with ID: ', ref);
                // a post redirect
                return res.redirect("/addlecture/" + courseid + "/" + lessonId);
            })
            .catch(err => {
                console.log("error Adding Document in Lectures Collection" + err);
            });
        console.log(courseid);
        // res.send("AddlessonDb Route " + courseid + " " + metadata);

    } else {
        res.redirect("/");
    }
});

//Uploading Lecture Video URL in DB
app.post('/uploadlecturevideodb/:courseid/:lessonid/:lectureid', (req, res) => {
    console.log('uploadlecturevideodb route');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonid = req.params.lessonid;
        const lectureid = req.params.lectureid;
        const lecturevideourl = req.body.LectureVideoUrl;
        console.log("URL--- " + lecturevideourl)
        let instructorCoursesRef = db.collection('Courses');
        var data = {
            lectureVideoUrl: lecturevideourl
        };
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
        lectureRef.doc(lectureid).update(data)
            .then(() => {
                console.log("Lecture Video Added");
                console.log("Via Add Lecture Video Route");
                return res.redirect("/addlecture/" + courseid + "/" + lessonid);
            }).catch(err => {
                console.log('Error Updating Lecture Doc' + err);
            });
    } else {
        res.redirect("/");
    }
});

app.post('/editlecturedb/:courseid', (req, res) => {

    // res.redirect('/test');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        const lessonId = req.body.LessonId;
        const lectureId = req.body.EditLectureId;
        const lectureName = req.body.EditLectureName;
        const lectureDescription = req.body.EditLectureDescription;
        // res.send(lessonId + ' - ' + lectureName + ' - ' + lectureDescription);
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        const data = {
                lectureName: lectureName,
                lectureDescription: lectureDescription,
                lectureLastUpdated: date,
            }
            // let instructorCoursesRef = db.collection('Courses');
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonId).collection('Lectures');

        lectureRef.doc(lectureId)
            .update(data).then(() => {
                console.log("Lecture Doc - " + lectureId + " - updated ");
                return res.redirect("/addlecture/" + courseid + "/" + lessonId)
            })
            .catch(err => {
                console.log("error Adding Document in Lectures Collection" + err);
            });
        console.log(courseid);
        // res.send("AddlessonDb Route " + courseid + " " + metadata);

    } else {
        res.redirect("/");
    }
});

app.get("/golive/:courseid", (req, res) => {
    console.log('golive route');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        // res.send(courseid);
        let instructorCoursesRef = db.collection('Courses');
        let courseRef = db.collection('Courses');
        courseRef.doc(courseid).update({ status: "live" })
            .then(() => {
                console.log("Course Live");
                return res.redirect("/instructormycourse");
            }).catch(err => {
                console.log('Error Updating Course Status' + err);
            });
    } else {
        res.redirect("/");
    }
});

app.get("/stoplive/:courseid", (req, res) => {
    console.log('stoplive route');
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        // res.send(courseid);
        let instructorCoursesRef = db.collection('Courses');
        let courseRef = db.collection('Courses');
        courseRef.doc(courseid).update({ status: "pending" })
            .then(() => {
                console.log("Course Not Live Now....");
                return res.redirect("/instructormycourse");
            }).catch(err => {
                console.log('Error Updating Course Status' + err);
            });
    } else {
        res.redirect("/");
    }
});

//******************Student Routes Starts****************

app.get("/studentcourse/:courseid", (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseid;
        let coursesRef = db.collection('Courses');
        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        // console.log(courseid);
        let courseId;
        let courseInfo;
        let lessons = [];
        let data = { user: metadata };
        let courseDataPromise = coursesRef.doc(courseid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    courseId = doc.id;
                    courseInfo = doc.data()
                    let courseData = {
                        courseId: courseId,
                        courseInfo: courseInfo,
                        // user: metadata
                    };
                    return courseData;
                }
            })
            .catch(err => {
                console.log('Error getting course document', err);
            });
        let lessonDataPromise;
        if (lessonsRef !== null) {
            lessonDataPromise = lessonsRef.orderBy('timestamp').get()
                .then(snapshot => {
                    snapshot.forEach(lessondoc => {
                        console.log("lesson doc ");
                        console.log(lessondoc.id, '=>', lessondoc.data());

                        var lessonData = {
                                lessonId: lessondoc.id,
                                lessonInfo: lessondoc.data()
                            }
                            //lessonId.push(lessondoc.id);
                        lessons.push(lessonData);
                        // return;
                        //console.log("TEMP LESSONS ARRAY" + JSON.stringify(templessons));
                    });
                    // console.log("LESSONS ARRAY-------" + JSON.stringify(lessons));
                    return lessons;
                })
                .catch(err => {
                    console.log('Error getting lesson documents', err);
                });
        }
        courseDataPromise.then(courseData => {
                data = Object.assign(data, { course: courseData });
                return data;
            })
            .then(data => {
                lessonDataPromise.then(lessons => {
                    //console.log("FL-----" + JSON.stringify(finallessons));
                    data = Object.assign(data, { lessons: lessons });
                    console.log("DATA -------------> " + JSON.stringify(data));
                    res.render("./Student/course.ejs", data);
                    return;
                }).catch(err => {
                    console.log(err);
                })
                return;
            }).catch(err => {
                console.log(err);
            })
    } else {
        res.redirect("/");
    }
});

app.get("/enrollcourse/:courseId", (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseId;
        const uid = metadata.uid;
        console.log("UID__________" + uid);
        console.log("courseid__________" + courseid);
        let UsersCollectionsRef = db.collection('UsersCollections');
        //enrolling course in courses collection
        let data = {
            courseid: courseid,
            enrolledon: FieldValue.serverTimestamp(),
            paid: false
        }
        console.log("DATA ____ " + JSON.stringify(data));
        UsersCollectionsRef.doc(uid).collection("Courses").add(data)
            .then(ref => {
                console.log('Enrolled course with Enrollment ID: ' + ref.id);
                return res.redirect('/student');
            }).catch(err => {
                console.log('Error Adding course  ' + err);
            });

    } else {
        res.redirect("/");
    }
});

app.get("/learncourse/:courseId", (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseId;
        let coursesRef = db.collection('Courses');
        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        // console.log(courseid);
        let courseId;
        let courseInfo;
        let lessons = [];
        let data = { user: metadata };
        let courseDataPromise = coursesRef.doc(courseid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return null;
                } else {
                    console.log('Document data:', doc.data());
                    courseId = doc.id;
                    courseInfo = doc.data()
                    let courseData = {
                        courseId: courseId,
                        courseInfo: courseInfo,
                        // user: metadata
                    };
                    if (courseInfo.status === 'pending')
                        return res.send('Course Not Live Sorry...');
                    return courseData;
                }
            })
            .catch(err => {
                console.log('Error getting course document', err);
            });
        let lessonDataPromise;

        if (lessonsRef !== null) {
            lessonDataPromise = lessonsRef.orderBy('timestamp').get()
                .then(snapshot => {
                    snapshot.forEach(lessondoc => {
                        console.log("lesson doc ");
                        console.log(lessondoc.id, '=>', lessondoc.data());

                        var lessonData = {
                                lessonId: lessondoc.id,
                                lessonInfo: lessondoc.data()
                            }
                            //lessonId.push(lessondoc.id);

                        lessons.push(lessonData);
                        // return;
                        //console.log("TEMP LESSONS ARRAY" + JSON.stringify(templessons));
                    });
                    return lessons;
                })
                .catch(err => {
                    console.log('Error getting lesson documents', err);
                });
        }
        courseDataPromise.then(courseData => {
            // data = Object.assign(data, { course: courseData });
            data.course = courseData;
            return data;
        }).then(data => {
            lessonDataPromise.then(lessons => {
                //console.log("FL-----" + JSON.stringify(finallessons));
                // data = Object.assign(data, { lessons: lessons });
                data.lessons = lessons;
                console.log("DATA -------------> " + JSON.stringify(data));
                res.render("./Student/learncourse.ejs", data);
                return;
            }).catch(err => {
                console.log(err);
            })
            return;
        }).catch(err => {
            console.log(err);
        })

    } else {
        res.redirect("/");
    }
});

app.get("/learnlesson/:courseId/:lessonId", (req, res) => {
    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseId;
        const lessonid = req.params.lessonId;
        // console.log("Meta Data Addlecture " + JSON.stringify(metadata));
        let lessonsRef = db.collection('Courses').doc(courseid).collection('Lessons');
        let instructorCoursesRef = db.collection('Courses');
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
        instructorCoursesRef.doc(courseid).get()
            .then(doc => {
                if (!doc.exists) {
                    console.log('No such document!');
                    return;
                } else {
                    console.log('Document data:', doc.data());
                    courseId = doc.id;
                    courseInfo = doc.data()
                    data = {
                        courseId: courseId,
                        courseInfo: courseInfo,
                        userId: metadata.uid,
                        userInfo: metadata.userInfo
                    };
                    return;
                }

            }).then(() => {
                lessonsRef.doc(lessonid).get()
                    .then(lessondoc => {
                        if (!lessondoc.exists) {
                            console.log('No such document!');
                            return;
                        } else {
                            console.log('lesson Document data:', lessondoc.data());
                            lessonId = lessondoc.id;
                            lessonInfo = lessondoc.data()
                            lesson = {
                                lessonId: lessonId,
                                lessonInfo: lessonInfo,
                            };
                            // data = Object.assign(data, { lesson: lesson });
                            data.lesson = lesson;
                            return data;
                        }
                    })
                    .then(function() {
                        console.log("Lesson DATA " + JSON.stringify(data));

                        // res.render("addlecture.ejs", data);
                        // let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
                        var lectures = [];
                        lectureRef.orderBy('timestamp').get()
                            .then(snapshot => {
                                snapshot.forEach(lecturedoc => {
                                    console.log("lesson doc ");
                                    console.log(lecturedoc.id, '=>', lecturedoc.data());
                                    lectures.push({
                                        lectureId: lecturedoc.id,
                                        lectureInfo: lecturedoc.data()
                                    })
                                });
                                // console.log("lectures" + lectures);
                                return;
                            })
                            .then(function() {
                                console.log("lectures" + lectures);
                                // data = Object.assign(data, { lectures: lectures });
                                data.lectures = lectures;
                                console.log("DATA------->" + JSON.stringify(data))
                                return res.render("./Student/learnlesson.ejs", data);
                            })
                            .catch(err => {
                                console.log('Error getting lecture document', err);
                            });
                        return;
                    })
                    .catch(err => {
                        console.log('Error getting lesson document', err);
                    });
                return;
            })
            .catch(err => {
                console.log('Error getting Course document', err);
            });
    } else {
        res.redirect("/");
    }
});

app.get("/playlecturevideo/:courseId/:lessonId/:lectureId", (req, res) => {

    if (req.cookies.__session) {
        const metadata = req.cookies.__session;
        const courseid = req.params.courseId;
        const lessonid = req.params.lessonId;
        const lectureid = req.params.lectureId;
        var data = {
            uid: metadata.uid,
            userInfo: metadata.userInfo,
            courseId: courseid,
            lessonId: lessonid
        }
        let lectureRef = db.collection('Courses').doc(courseid).collection('Lessons').doc(lessonid).collection('Lectures');
        lectureRef.doc(lectureid).get().then(lecturedoc => {
            if (!lecturedoc.exists) {
                console.log('No such document!');
                return;
            } else {
                console.log('lecture Document data:', lecturedoc.data());
                lectureId = lecturedoc.id;
                lectureInfo = lecturedoc.data()
                lecture = {
                    lectureId: lectureId,
                    lectureInfo: lectureInfo,
                };

                data.lecture = lecture;
                console.log('data' + JSON.stringify(data));
                res.render('./Student/playlecture.ejs', data);
                return;
            }
        }).catch(err => {
            console.log("Error " + err);
        });

    } else {
        res.redirect('/');
    }
});

exports.app = functions.https.onRequest(app);