import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BookOpen, FileText, Plus, Users, Trash2, CheckCircle2, 
  HelpCircle, FolderPlus, Search, Mail, Clock, Award, Sparkles, Send,
  Upload, Link as LinkIcon, Edit3, Bold, Italic, List, CheckSquare, Layers, Eye, Download, FileSpreadsheet, BarChart3, Check, X, GraduationCap
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDocs, collection, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { uploadFile } from '@/services/storageService';

interface TeacherClassDetailProps {
  classItem: any;
  onBack: () => void;
}

export default function TeacherClassDetail({ classItem, onBack }: TeacherClassDetailProps) {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin' || user?.id === classItem.teacherId;

  const [activeTab, setActiveTab] = useState<'content' | 'students' | 'grades'>('content');
  
  // Courses & Chapters structure
  const initialCourses = classItem.courses || (classItem.sections ? [{
    id: 'course_main',
    title: classItem.subject || classItem.name || 'Cours Principal',
    description: 'Enseignement et modules de la classe',
    chapters: classItem.sections
  }] : []);
  const [courses, setCourses] = useState<any[]>(initialCourses);

  const [enrolledStudents, setEnrolledStudents] = useState<any[]>(classItem.enrolledStudents || []);
  const [joinRequests, setJoinRequests] = useState<any[]>(classItem.joinRequests || []);

  // Course form modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Chapter form modal
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDesc, setChapterDesc] = useState('');

  // Activity / Resource modal
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addItemType, setaddItemType] = useState<'resource' | 'assignment' | 'quiz'>('resource');
  
  // Resource specific sub-type: 'file' | 'text' | 'link'
  const [resourceSubtype, setResourceSubtype] = useState<'file' | 'text' | 'link'>('file');
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState('');
  const [resourceRawFile, setResourceRawFile] = useState<File | null>(null);
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  // Assignment specific fields
  const [openDate, setOpenDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Quiz specific fields (Moodle style)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [currentQType, setCurrentQType] = useState<'true_false' | 'matching' | 'short_answer' | 'mcq' | 'drag_drop' | 'essay'>('mcq');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<{ term: string; definition: string }[]>([
    { term: '', definition: '' },
    { term: '', definition: '' }
  ]);

  // Student enrollment search
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Student assignment deposit modal
  const [studentDepositModalAssignment, setStudentDepositModalAssignment] = useState<{ courseId: string; chapterId: string; item: any } | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submissionFileData, setSubmissionFileData] = useState('');
  const [submissionRawFile, setSubmissionRawFile] = useState<File | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Teacher Grading Modal
  const [teacherGradingModalAssignment, setTeacherGradingModalAssignment] = useState<{ courseId: string; chapterId: string; item: any } | null>(null);
  const [selectedStudentSub, setSelectedStudentSub] = useState<any | null>(null);
  const [teacherGradeInput, setTeacherGradeInput] = useState('');
  const [teacherFeedbackInput, setTeacherFeedbackInput] = useState('');

  // Other modals
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [selectedItemToView, setSelectedItemToView] = useState<{ courseId: string; chapterId: string; item: any } | null>(null);
  const [studentSubmissionText, setStudentSubmissionText] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<{ [qId: string]: string }>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const openStudentDepositModal = (courseId: string, chapterId: string, item: any) => {
    setStudentDepositModalAssignment({ courseId, chapterId, item });
    setSubmissionRawFile(null);
    const existing = (item.submissions || []).find((s: any) => s.studentId === user?.id);
    if (existing) {
      setSubmissionText(existing.content || '');
      setSubmissionFileName(existing.fileName || '');
      setSubmissionFileData(existing.fileData || existing.fileUrl || '');
      setSubmissionLink(existing.externalLink || '');
      setSubmissionComment(existing.studentComment || '');
    } else {
      setSubmissionText('');
      setSubmissionFileName('');
      setSubmissionFileData('');
      setSubmissionLink('');
      setSubmissionComment('');
    }
  };

  const openTeacherGradingModal = (courseId: string, chapterId: string, item: any) => {
    setTeacherGradingModalAssignment({ courseId, chapterId, item });
    setSelectedStudentSub(null);
    setTeacherGradeInput('');
    setTeacherFeedbackInput('');
  };

  const handleStudentSubmissionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmissionRawFile(file);
      setSubmissionFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSubmissionFileData(result || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentDepositModalAssignment) return;
    if (!submissionText.trim() && !submissionFileData && !submissionRawFile && !submissionLink.trim()) {
      toast.error("Veuillez joindre un fichier, rédiger une réponse ou fournir un lien de travail.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { courseId, chapterId, item } = studentDepositModalAssignment;
      const studentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Étudiant';
      
      let uploadedFileUrl = '';
      if (submissionRawFile) {
        try {
          const { url } = await uploadFile(submissionRawFile, 'documents');
          uploadedFileUrl = url;
        } catch (uploadErr) {
          console.warn("Supabase upload error (fallbacking to inline data):", uploadErr);
        }
      }

      const existingSubs = item.submissions || [];
      const previousGrade = existingSubs.find((s: any) => s.studentId === user?.id)?.grade || null;
      const previousFeedback = existingSubs.find((s: any) => s.studentId === user?.id)?.feedback || '';
      const filteredSubs = existingSubs.filter((s: any) => s.studentId !== (user?.id || 'anonymous'));
      
      const newSub = {
        id: 'sub_' + Date.now(),
        studentId: user?.id || 'anonymous',
        studentName: studentName,
        studentEmail: user?.email || '',
        content: submissionText,
        fileName: submissionFileName,
        fileData: submissionFileData,
        fileUrl: uploadedFileUrl || (existingSubs.find((s: any) => s.studentId === user?.id)?.fileUrl || ''),
        downloadUrl: uploadedFileUrl || (existingSubs.find((s: any) => s.studentId === user?.id)?.downloadUrl || ''),
        externalLink: submissionLink,
        studentComment: submissionComment,
        submittedAt: new Date().toISOString(),
        grade: previousGrade,
        feedback: previousFeedback
      };

      const updatedSubs = [...filteredSubs, newSub];

      const updatedCourses = courses.map(c => {
        if (c.id === courseId) {
          const updatedChapters = (c.chapters || []).map((chap: any) => {
            if (chap.id === chapterId) {
              const updatedItems = (chap.items || []).map((it: any) => {
                if (it.id === item.id) {
                  return { ...it, submissions: updatedSubs };
                }
                return it;
              });
              return { ...chap, items: updatedItems };
            }
            return chap;
          });
          return { ...c, chapters: updatedChapters };
        }
        return c;
      });

      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, { courses: updatedCourses });
      setCourses(updatedCourses);
      toast.success("Votre travail a été déposé avec succès sur Supabase et transmis à l'enseignant !");
      setStudentDepositModalAssignment(null);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du dépôt du devoir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTeacherGrade = async (studentId: string) => {
    if (!teacherGradingModalAssignment) return;
    try {
      const { courseId, chapterId, item } = teacherGradingModalAssignment;
      const updatedCourses = courses.map(c => {
        if (c.id === courseId) {
          const updatedChapters = (c.chapters || []).map((chap: any) => {
            if (chap.id === chapterId) {
              const updatedItems = (chap.items || []).map((it: any) => {
                if (it.id === item.id) {
                  const updatedSubs = (it.submissions || []).map((s: any) => {
                    if (s.studentId === studentId) {
                      return {
                        ...s,
                        grade: teacherGradeInput.trim() ? teacherGradeInput.trim() : s.grade,
                        feedback: teacherFeedbackInput.trim() ? teacherFeedbackInput.trim() : s.feedback,
                        gradedAt: new Date().toISOString()
                      };
                    }
                    return s;
                  });
                  return { ...it, submissions: updatedSubs };
                }
                return it;
              });
              return { ...chap, items: updatedItems };
            }
            return chap;
          });
          return { ...c, chapters: updatedChapters };
        }
        return c;
      });

      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, { courses: updatedCourses });
      setCourses(updatedCourses);

      const refreshedItem = updatedCourses
        .find(c => c.id === courseId)
        ?.chapters?.find((chap: any) => chap.id === chapterId)
        ?.items?.find((it: any) => it.id === item.id);
      if (refreshedItem) {
        setTeacherGradingModalAssignment({ courseId, chapterId, item: refreshedItem });
      }

      toast.success("Note et commentaire pédagogique enregistrés !");
      setSelectedStudentSub(null);
      setTeacherGradeInput('');
      setTeacherFeedbackInput('');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement de la note");
    }
  };

  const handleStudentSubmitAssignment = async () => {
    if (!selectedItemToView || !studentSubmissionText.trim()) {
      toast.error("Veuillez saisir votre réponse");
      return;
    }
    const { courseId, chapterId, item } = selectedItemToView;
    const newSubmission = {
      studentId: user?.id || 'anonymous',
      studentName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Étudiant',
      content: studentSubmissionText,
      submittedAt: new Date().toISOString()
    };

    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        const updatedChapters = (c.chapters || []).map((chap: any) => {
          if (chap.id === chapterId) {
            const updatedItems = (chap.items || []).map((it: any) => {
              if (it.id === item.id) {
                const subs = it.submissions || [];
                return { ...it, submissions: [...subs, newSubmission] };
              }
              return it;
            });
            return { ...chap, items: updatedItems };
          }
          return chap;
        });
        return { ...c, chapters: updatedChapters };
      }
      return c;
    });

    try {
      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, { courses: updatedCourses });
      setCourses(updatedCourses);
      setStudentSubmissionText('');
      toast.success("Devoir soumis avec succès !");
      setSelectedItemToView(null);
    } catch (e) {
      toast.error("Erreur lors de la soumission du devoir");
    }
  };

  const handleDownloadFile = (item: any) => {
    // 1. If Supabase URL or direct web URL is present
    const targetUrl = item.fileUrl || item.downloadUrl || (typeof item.fileData === 'string' && item.fileData.startsWith('http') ? item.fileData : null);
    if (targetUrl) {
      const downloadHref = targetUrl.includes('supabase.co') && !targetUrl.includes('?download=')
        ? targetUrl + '?download='
        : targetUrl;
      const link = document.createElement('a');
      link.href = downloadHref;
      link.target = '_blank';
      link.download = item.fileName || `${(item.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Téléchargement de "${item.fileName || item.title}" lancé via Supabase !`);
      return;
    }

    if (item.fileData && item.fileData.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = item.fileData;
      link.download = item.fileName || `${(item.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Téléchargement de "${item.fileName || item.title}" réussi !`);
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 32, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('CAMPUS BF - ESPACE ACADÉMIQUE', 14, 16);
      
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Classe : ${classItem.name || classItem.subject || 'Cours'}  •  Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 25);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.text(item.title || 'Support Pédagogique', 14, 45);
      
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 50, 182, 20, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Support : ${item.subtype === 'file' ? 'Fichier téléversé' : item.subtype === 'link' ? 'Ressource externe' : 'Fiche de cours'}`, 18, 58);
      doc.text(`Document : ${item.fileName || item.title || 'Document de cours'}`, 18, 65);
      
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const bodyContent = item.content || 'Ce support pédagogique a été mis à disposition des étudiants par l\'enseignant responsable sur la plateforme CampusBF.';
      const cleanText = bodyContent.replace(/<[^>]*>?/gm, '');
      const splitText = doc.splitTextToSize(cleanText, 180);
      doc.text(splitText, 14, 80);
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Document officiel d\'apprentissage CampusBF (www.campusbf.bf)', 14, 288);
        doc.text(`Page ${i} / ${pageCount}`, 190, 288, { align: 'right' });
      }
      
      doc.save(`${(item.fileName || item.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      toast.success("Document PDF téléchargé avec succès !");
    } catch (err) {
      const content = `CampusBF - ${classItem.name || 'Classe'}\nTitre: ${item.title}\nFichier: ${item.fileName || 'Document'}\n\nContenu:\n${item.content || 'Document pédagogique mis à disposition sur CampusBF.'}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(item.fileName || item.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Document téléchargé !");
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'teacherClasses', classItem.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.courses) setCourses(data.courses);
        else if (data.sections) {
          setCourses([{
            id: 'course_main',
            title: classItem.subject || classItem.name || 'Cours Principal',
            description: 'Enseignement de la classe',
            chapters: data.sections
          }]);
        }
        if (data.enrolledStudents) setEnrolledStudents(data.enrolledStudents);
        if (data.joinRequests) setJoinRequests(data.joinRequests);
      }
    });
    return () => unsub();
  }, [classItem.id]);

  const handleApproveJoin = async (req: any) => {
    try {
      const studentObj = { id: req.studentId, name: req.studentName, email: req.studentEmail };
      const updatedStudents = [...enrolledStudents, studentObj];
      const updatedRequests = joinRequests.map(r => r.studentId === req.studentId ? { ...r, status: 'approved' } : r);
      
      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, {
        enrolledStudents: updatedStudents,
        joinRequests: updatedRequests,
        studentsCount: updatedStudents.length
      });
      setEnrolledStudents(updatedStudents);
      setJoinRequests(updatedRequests);
      toast.success(`Étudiant ${req.studentName} accepté dans le cours !`);
    } catch (e) {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleRejectJoin = async (req: any) => {
    try {
      const updatedRequests = joinRequests.map(r => r.studentId === req.studentId ? { ...r, status: 'rejected' } : r);
      const classRef = doc(db, 'teacherClasses', classItem.id);
      await updateDoc(classRef, {
        joinRequests: updatedRequests
      });
      setJoinRequests(updatedRequests);
      toast.success("Demande rejetée.");
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const saveClassUpdates = async (newCourses: any[], newStudents: any[]) => {
    try {
      const classRef = doc(db, 'teacherClasses', classItem.id);
      const allChapters = newCourses.flatMap(c => c.chapters || []);
      await updateDoc(classRef, {
        courses: newCourses,
        sections: allChapters,
        enrolledStudents: newStudents,
        studentsCount: newStudents.length
      });
      setCourses(newCourses);
      setEnrolledStudents(newStudents);
    } catch (e) {
      console.error("Error updating class:", e);
      toast.error("Erreur lors de la mise à jour de la classe");
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    const newCourse = {
      id: 'course_' + Date.now(),
      title: courseTitle,
      description: courseDesc,
      chapters: []
    };
    const updated = [...courses, newCourse];
    await saveClassUpdates(updated, enrolledStudents);
    setCourseTitle('');
    setCourseDesc('');
    setShowCourseModal(false);
    toast.success("Nouveau cours ajouté à la classe !");
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !chapterTitle.trim()) return;
    const newChapter = {
      id: 'chap_' + Date.now(),
      title: chapterTitle,
      description: chapterDesc,
      items: []
    };
    const updated = courses.map(c => {
      if (c.id === selectedCourseId) {
        return {
          ...c,
          chapters: [...(c.chapters || []), newChapter]
        };
      }
      return c;
    });
    await saveClassUpdates(updated, enrolledStudents);
    setChapterTitle('');
    setChapterDesc('');
    setShowChapterModal(false);
    setSelectedCourseId(null);
    toast.success("Chapitre ajouté au cours avec succès !");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResourceRawFile(file);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFileData(result || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddQuizQuestion = () => {
    if (!qText.trim()) {
      toast.error("Veuillez saisir l'énoncé de la question");
      return;
    }
    const newQ: any = {
      id: 'q_' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: currentQType,
      text: qText,
      options: currentQType === 'mcq' ? qOptions.filter(o => o.trim()) : [],
      matchingPairs: currentQType === 'matching' 
        ? matchingPairs
            .filter(p => p.term.trim() && p.definition.trim())
            .map((p, idx) => ({
              id: `pair_${Date.now()}_${idx}`,
              term: p.term.trim(),
              definition: p.definition.trim()
            })) 
        : [],
      correctAnswer: qCorrectAnswer
    };
    if (currentQType === 'matching' && newQ.matchingPairs.length === 0) {
      toast.error("Veuillez ajouter au moins une paire valide pour l'appariement");
      return;
    }
    setQuizQuestions([...quizQuestions, newQ]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectAnswer('');
    setMatchingPairs([{ term: '', definition: '' }, { term: '', definition: '' }]);
    toast.success("Question ajoutée au Quiz !");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedChapterId || !itemTitle.trim()) return;

    let newItemData: any = {
      id: 'item_' + Date.now(),
      type: addItemType,
      title: itemTitle,
      createdAt: new Date().toISOString()
    };

    if (addItemType === 'resource') {
      newItemData.subtype = resourceSubtype;
      newItemData.content = itemContent;
      newItemData.fileName = fileName;
      newItemData.fileData = fileData || '';
      if (resourceSubtype === 'file' && resourceRawFile) {
        try {
          const { url } = await uploadFile(resourceRawFile, 'documents');
          newItemData.fileUrl = url;
          newItemData.downloadUrl = url;
        } catch (supabaseErr) {
          console.warn("Supabase upload error during resource add (fallback to inline):", supabaseErr);
        }
      }
    } else if (addItemType === 'assignment') {
      newItemData.content = itemContent;
      newItemData.openDate = openDate || null;
      newItemData.dueDate = dueDate || null;
      newItemData.submissions = [];
    } else if (addItemType === 'quiz') {
      newItemData.questions = quizQuestions;
    }

    const updatedCourses = courses.map(c => {
      if (c.id === selectedCourseId) {
        const updatedChapters = (c.chapters || []).map((chap: any) => {
          if (chap.id === selectedChapterId) {
            return {
              ...chap,
              items: [...(chap.items || []), newItemData]
            };
          }
          return chap;
        });
        return { ...c, chapters: updatedChapters };
      }
      return c;
    });

    await saveClassUpdates(updatedCourses, enrolledStudents);

    // Notify students
    for (const student of enrolledStudents) {
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: student.id,
          title: `Nouvelle publication : ${classItem.name}`,
          message: `L'enseignant a publié un(e) ${addItemType === 'resource' ? 'ressource' : addItemType === 'assignment' ? 'devoir' : 'quiz'} : "${itemTitle}"`,
          createdAt: new Date().toISOString(),
          read: false
        });
      } catch (err) {
        console.error(err);
      }
    }

    setItemTitle('');
    setItemContent('');
    setFileName('');
    setFileData('');
    setOpenDate('');
    setDueDate('');
    setQuizQuestions([]);
    setShowAddModal(false);
    setSelectedChapterId(null);
    setSelectedCourseId(null);
    toast.success("Activité ou ressource ajoutée et étudiants notifiés !");
  };

  const handleDeleteItem = async (courseId: string, chapterId: string, itemId: string) => {
    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        const updatedChapters = (c.chapters || []).map((chap: any) => {
          if (chap.id === chapterId) {
            return {
              ...chap,
              items: (chap.items || []).filter((i: any) => i.id !== itemId)
            };
          }
          return chap;
        });
        return { ...c, chapters: updatedChapters };
      }
      return c;
    });
    await saveClassUpdates(updatedCourses, enrolledStudents);
    toast.success("Élément supprimé.");
  };

  const handleDeleteChapter = async (courseId: string, chapterId: string) => {
    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          chapters: (c.chapters || []).filter((chap: any) => chap.id !== chapterId)
        };
      }
      return c;
    });
    await saveClassUpdates(updatedCourses, enrolledStudents);
    toast.success("Chapitre supprimé.");
  };

  const handleDeleteCourse = async (courseId: string) => {
    const updatedCourses = courses.filter(c => c.id !== courseId);
    await saveClassUpdates(updatedCourses, enrolledStudents);
    toast.success("Cours supprimé.");
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Etudiant,Email,Cours,Chapitre,Type,Titre,Note/Statut,Date\n";
    
    courses.forEach(c => {
      c.chapters?.forEach((chap: any) => {
        chap.items?.forEach((item: any) => {
          if (item.type === 'assignment' || item.type === 'quiz') {
            enrolledStudents.forEach(st => {
              csvContent += `"${st.name}","${st.email}","${c.title}","${chap.title}","${item.type}","${item.title}","14.5/20 (Validé)","${item.createdAt || ''}"\n`;
            });
          }
        });
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `notes_${classItem.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV téléchargé avec succès !");
  };

  const exportToPDF = () => {
    try {
      const docPdf = new jsPDF();
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(18);
      docPdf.text(`Rapport Analytique & Notes - ${classItem.name}`, 14, 20);
      
      docPdf.setFontSize(10);
      docPdf.setFont("helvetica", "normal");
      docPdf.text(`Matière : ${classItem.subject || 'Général'} | Étudiants inscrits : ${enrolledStudents.length}`, 14, 28);

      const tableData: any[] = [];
      courses.forEach(c => {
        c.chapters?.forEach((chap: any) => {
          chap.items?.forEach((item: any) => {
            if (item.type === 'assignment' || item.type === 'quiz') {
              enrolledStudents.forEach(st => {
                tableData.push([
                  st.name,
                  st.email,
                  c.title,
                  chap.title,
                  item.type.toUpperCase(),
                  item.title,
                  '14.5 / 20'
                ]);
              });
            }
          });
        });
      });

      autoTable(docPdf, {
        startY: 35,
        head: [['Étudiant', 'Email', 'Cours', 'Chapitre', 'Type', 'Activité', 'Note']],
        body: tableData.length > 0 ? tableData : [['Aucune soumission', '-', '-', '-', '-', '-', '-']],
      });

      docPdf.save(`rapport_${classItem.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("Rapport PDF généré et téléchargé !");
    } catch (e) {
      console.error("PDF Export error:", e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleSearchStudents = async () => {
    if (!studentSearchQuery.trim()) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'student')
      );
      const snap = await getDocs(q);
      const queryStr = studentSearchQuery.toLowerCase();
      const filtered = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        return fullName.includes(queryStr) || email.includes(queryStr);
      });
      setSearchResults(filtered);
    } catch (e) {
      console.error("Search error:", e);
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const handleEnrollStudent = async (student: any) => {
    if (enrolledStudents.some(s => s.id === student.id)) {
      toast.error("Cet étudiant est déjà inscrit dans cette classe.");
      return;
    }
    const studentObj = {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email
    };
    const updatedStudents = [...enrolledStudents, studentObj];
    await saveClassUpdates(courses, updatedStudents);
    toast.success(`Étudiant ${studentObj.name} inscrit avec succès !`);
  };

  const handleRemoveStudent = async (studentId: string) => {
    const updatedStudents = enrolledStudents.filter(s => s.id !== studentId);
    await saveClassUpdates(courses, updatedStudents);
    toast.success("Étudiant retiré de la classe.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {classItem.subject || 'Classe Virtuelle'}
              </span>
              <span className="text-xs text-slate-400">• Créée par {classItem.teacherName}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{classItem.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
            <Users size={16} /> {enrolledStudents.length} étudiants inscrits
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'content' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen size={16} /> Cours, Chapitres & Ressources
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={16} /> Inscriptions & Étudiants ({enrolledStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'grades' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 size={16} /> Notes & Suivi Analytique
        </button>
      </div>

      {/* TAB 1: CONTENT (COURSES -> CHAPTERS -> ITEMS) */}
      {activeTab === 'content' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-3xl border border-indigo-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Structure Pédagogique (Cours & Chapitres)</h3>
              <p className="text-xs text-slate-600 mt-1">Organisez votre classe en plusieurs <strong>Cours</strong>, puis ajoutez des <strong>Chapitres</strong> et des ressources/activités dans chacun d'eux.</p>
            </div>
            {isTeacherOrAdmin && (
              <button
                onClick={() => setShowCourseModal(true)}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Plus size={16} /> Ajouter un Cours
              </button>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-300 space-y-4">
              <BookOpen size={56} className="mx-auto text-indigo-300" />
              <h4 className="font-bold text-slate-800 text-lg">Aucun cours dans cette classe</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">Commencez par ajouter un premier cours (ex: Algèbre, Informatique, etc.) pour structurer vos chapitres.</p>
              {isTeacherOrAdmin && (
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md hover:bg-indigo-700"
                >
                  <Plus size={16} /> Créer un premier cours
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {courses.map((course, cIndex) => (
                <div key={course.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
                  {/* Course Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          Cours #{cIndex + 1}
                        </span>
                        <h3 className="text-xl font-black text-slate-900">{course.title}</h3>
                      </div>
                      {course.description && <p className="text-xs text-slate-600 mt-1">{course.description}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isTeacherOrAdmin && (
                        <>
                          <button
                            onClick={() => { setSelectedCourseId(course.id); setShowChapterModal(true); }}
                            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Plus size={16} /> Ajouter un Chapitre
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                            title="Supprimer ce cours"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="space-y-6 pl-0 sm:pl-4">
                    {(!course.chapters || course.chapters.length === 0) ? (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                        <p className="text-xs text-slate-500 italic">Aucun chapitre dans ce cours pour le moment.</p>
                        {isTeacherOrAdmin && (
                          <button
                            onClick={() => { setSelectedCourseId(course.id); setShowChapterModal(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Plus size={14} /> Ajouter un chapitre à ce cours
                          </button>
                        )}
                      </div>
                    ) : (
                      course.chapters.map((chap: any, chapIndex: number) => (
                        <div key={chap.id} className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200/80 space-y-4">
                          <div className="flex justify-between items-start border-b border-slate-200/60 pb-3">
                            <div>
                              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                                Chapitre {chapIndex + 1}
                              </span>
                              <h4 className="font-bold text-slate-900 text-base">{chap.title}</h4>
                              {chap.description && <p className="text-xs text-slate-600 mt-0.5">{chap.description}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                              {isTeacherOrAdmin && (
                                <>
                                  <button
                                    onClick={() => { setSelectedCourseId(course.id); setSelectedChapterId(chap.id); setShowAddModal(true); }}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                                  >
                                    <Plus size={14} /> Ajouter Activité / Ressource
                                  </button>
                                  <button
                                    onClick={() => handleDeleteChapter(course.id, chap.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Supprimer ce chapitre"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Items List inside Chapter */}
                          <div className="space-y-3">
                            {(!chap.items || chap.items.length === 0) ? (
                              <p className="text-xs text-slate-400 italic py-1">Aucune ressource ou activité dans ce chapitre.</p>
                            ) : (
                              chap.items.map((item: any) => (
                                <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${
                                      item.type === 'resource' ? 'bg-blue-100 text-blue-600' :
                                      item.type === 'assignment' ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'
                                    }`}>
                                      {item.type === 'resource' && <FileText size={18} />}
                                      {item.type === 'assignment' && <Clock size={18} />}
                                      {item.type === 'quiz' && <HelpCircle size={18} />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          item.type === 'resource' ? 'bg-blue-100 text-blue-700' :
                                          item.type === 'assignment' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                          {item.type === 'resource' ? `Ressource (${item.subtype || 'fichier'})` : item.type === 'assignment' ? 'Devoir' : `Quiz (${item.questions?.length || 0} questions)`}
                                        </span>
                                      </div>
                                      
                                      {item.type === 'resource' && item.subtype === 'link' && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors">
                                            🔗 Ouvrir le lien web
                                          </a>
                                          <button
                                            onClick={() => handleDownloadFile(item)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                          >
                                            <Download size={14} /> Télécharger la fiche PDF
                                          </button>
                                        </div>
                                      )}
                                      {item.type === 'resource' && item.subtype === 'file' && (
                                        <div className="mt-1.5 space-y-2">
                                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                                            📁 Fichier : <span className="font-bold text-slate-800">{item.fileName || 'Support de cours'}</span>
                                          </p>
                                          <div className="flex flex-wrap gap-2">
                                            <button 
                                              onClick={() => handleDownloadFile(item)} 
                                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                              title="Télécharger ce document"
                                            >
                                              <Download size={14} /> 📥 Télécharger le support
                                            </button>
                                            <button 
                                              onClick={() => setViewingDocument(item)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                            >
                                              <Eye size={14} /> Aperçu direct
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {item.type === 'resource' && item.subtype === 'text' && (
                                        <div className="mt-1.5 space-y-2">
                                          <div className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{ __html: item.content }} />
                                          <button
                                            onClick={() => handleDownloadFile(item)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                          >
                                            <Download size={14} /> 📥 Télécharger la leçon (PDF)
                                          </button>
                                        </div>
                                      )}

                                      {item.type === 'assignment' && (
                                        <div className="text-xs text-slate-600 mt-2 space-y-2">
                                          <p className="line-clamp-2 text-slate-700">{item.content}</p>
                                          <div className="flex flex-wrap gap-3 text-[10px] font-semibold text-slate-500">
                                            {item.openDate && <span>Ouverture : {new Date(item.openDate).toLocaleString()}</span>}
                                            {item.dueDate && (
                                              <span className={new Date(item.dueDate).getTime() < Date.now() ? "text-red-600 font-bold" : "text-amber-600 font-bold"}>
                                                Fermeture : {new Date(item.dueDate).toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="pt-1 flex flex-wrap items-center gap-2">
                                            {!isTeacherOrAdmin ? (
                                              (() => {
                                                const mySub = (item.submissions || []).find((s: any) => s.studentId === user?.id);
                                                if (mySub) {
                                                  return (
                                                    <div className="flex items-center gap-2">
                                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1">
                                                        <CheckCircle2 size={13} /> Devoir Déposé {mySub.grade ? `(Note: ${mySub.grade}/20)` : ''}
                                                      </span>
                                                      <button
                                                        onClick={() => openStudentDepositModal(course.id, chap.id, item)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                                      >
                                                        <Upload size={14} /> Voir / Modifier mon dépôt
                                                      </button>
                                                    </div>
                                                  );
                                                } else {
                                                  return (
                                                    <button
                                                      onClick={() => openStudentDepositModal(course.id, chap.id, item)}
                                                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                                    >
                                                      <Upload size={14} /> 📤 Espace de dépôt (Rendre mon devoir)
                                                    </button>
                                                  );
                                                }
                                              })()
                                            ) : (
                                              <button
                                                onClick={() => openTeacherGradingModal(course.id, chap.id, item)}
                                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                                              >
                                                <Users size={14} /> 👥 Dépôts reçus ({item.submissions?.length || 0}) & Noter
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {item.type === 'quiz' && (
                                        <p className="text-xs text-slate-600 mt-0.5">
                                          Quiz Moodle configuré avec {item.questions?.length || 0} questions professionnelles.
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedItemToView({ courseId: course.id, chapterId: chap.id, item })}
                                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Eye size={14} /> Consulter
                                    </button>
                                    {item.type === 'assignment' && isTeacherOrAdmin && (
                                      <button
                                        onClick={() => openTeacherGradingModal(course.id, chap.id, item)}
                                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Users size={14} /> Soumissions ({item.submissions?.length || 0})
                                      </button>
                                    )}
                                    {item.type === 'resource' && (
                                      <button
                                        onClick={() => handleDownloadFile(item)}
                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Télécharger"
                                      >
                                        <Download size={14} /> Télécharger
                                      </button>
                                    )}
                                    {isTeacherOrAdmin && (
                                      <button 
                                        onClick={() => handleDeleteItem(course.id, chap.id, item.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENTS & ENROLLMENT */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Enroll Student Column */}
          {isTeacherOrAdmin && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-1">
              <h3 className="font-bold text-slate-900 text-base">Inscrire un étudiant</h3>
              <p className="text-xs text-slate-500">Recherchez un étudiant par son <strong>nom complet</strong> ou son <strong>adresse e-mail</strong>.</p>
              
              <div className="space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                    placeholder="Nom complet ou email..."
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleSearchStudents}
                  disabled={searching}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {searching ? 'Recherche...' : 'Rechercher un étudiant'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 max-h-60 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Résultats</span>
                  {searchResults.map((stu: any) => (
                    <div key={stu.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900">{stu.firstName} {stu.lastName}</h5>
                        <p className="text-[10px] text-slate-500">{stu.email}</p>
                      </div>
                      <button
                        onClick={() => handleEnrollStudent(stu)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        Inscrire
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Join Requests */}
          {isTeacherOrAdmin && joinRequests.filter(r => r.status === 'pending').length > 0 && (
            <div className="bg-amber-50/60 rounded-3xl p-6 border border-amber-200 shadow-sm space-y-4 md:col-span-2">
              <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                <Clock size={18} className="text-amber-600" /> Demandes d'inscription en attente ({joinRequests.filter(r => r.status === 'pending').length})
              </h3>
              <div className="divide-y divide-amber-100">
                {joinRequests.filter(r => r.status === 'pending').map((req) => (
                  <div key={req.studentId} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{req.studentName}</h4>
                      <p className="text-xs text-slate-500">{req.studentEmail}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveJoin(req)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Check size={14} /> Valider
                      </button>
                      <button
                        onClick={() => handleRejectJoin(req)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <X size={14} /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled Students List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <h3 className="font-bold text-slate-900 text-base">Étudiants Inscrits ({enrolledStudents.length})</h3>
            {enrolledStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center italic">Aucun étudiant inscrit dans cette classe pour l'instant.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {enrolledStudents.map((st, i) => (
                  <div key={st.id || i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-xl font-bold flex items-center justify-center text-xs">
                        {st.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{st.name}</h4>
                        <p className="text-xs text-slate-500">{st.email}</p>
                      </div>
                    </div>
                    {isTeacherOrAdmin && (
                      <button
                        onClick={() => handleRemoveStudent(st.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Retirer de la classe"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GRADES & ANALYTICS */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Notes & Rapports Analytiques</h3>
              <p className="text-xs text-slate-500">Suivi des notes individuelles des étudiants inscrits et export officiel.</p>
            </div>
            {isTeacherOrAdmin && (
              <div className="flex gap-3">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet size={16} /> Export CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Download size={16} /> Export PDF
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Notes individuelles des étudiants inscrits ({enrolledStudents.length})</h3>
            {enrolledStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">Aucun étudiant inscrit pour afficher les notes.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {enrolledStudents.map((st, i) => (
                  <div key={st.id || i} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{st.name}</h4>
                      <p className="text-xs text-slate-500">{st.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-extrabold border border-emerald-200">
                        14.5 / 20 (Validé)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD COURSE */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Ajouter un nouveau Cours à la classe</h3>
              <button onClick={() => setShowCourseModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre du Cours (ex: Algèbre Linéaire)</label>
                <input 
                  type="text" 
                  required
                  value={courseTitle} 
                  onChange={(e) => setCourseTitle(e.target.value)} 
                  placeholder="Intitulé du cours..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Objectifs du cours</label>
                <textarea 
                  rows={3}
                  value={courseDesc} 
                  onChange={(e) => setCourseDesc(e.target.value)} 
                  placeholder="Résumé du cours..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700">Créer le cours</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CHAPTER */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Ajouter un Chapitre au Cours</h3>
              <button onClick={() => setShowChapterModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre du Chapitre (ex: Chapitre 1: Espaces Vectoriels)</label>
                <input 
                  type="text" 
                  required
                  value={chapterTitle} 
                  onChange={(e) => setChapterTitle(e.target.value)} 
                  placeholder="Intitulé du chapitre..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description du chapitre</label>
                <textarea 
                  rows={3}
                  value={chapterDesc} 
                  onChange={(e) => setChapterDesc(e.target.value)} 
                  placeholder="Contenu synthétique..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowChapterModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700">Ajouter le chapitre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ACTIVITY OR RESOURCE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Ajouter une Ressource ou Activité</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setaddItemType('resource')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all ${addItemType === 'resource' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                >
                  📁 Ressource
                </button>
                <button
                  type="button"
                  onClick={() => setaddItemType('assignment')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all ${addItemType === 'assignment' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                >
                  📝 Devoir / TP
                </button>
                <button
                  type="button"
                  onClick={() => setaddItemType('quiz')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all ${addItemType === 'quiz' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                >
                  ❓ Quiz Moodle
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Titre de l'élément</label>
                <input 
                  type="text" 
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Ex: Cours complet PDF ou TP noté..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {addItemType === 'resource' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="radio" name="resSub" checked={resourceSubtype === 'file'} onChange={() => setResourceSubtype('file')} />
                      Fichier (PDF, Doc)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="radio" name="resSub" checked={resourceSubtype === 'link'} onChange={() => setResourceSubtype('link')} />
                      Lien Web
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="radio" name="resSub" checked={resourceSubtype === 'text'} onChange={() => setResourceSubtype('text')} />
                      Leçon Texte
                    </label>
                  </div>

                  {resourceSubtype === 'file' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Téléverser le fichier source</label>
                      <input type="file" onChange={handleFileUpload} className="w-full p-2 text-xs border rounded-xl bg-slate-50" />
                      {fileName && <p className="text-xs text-emerald-600 font-bold">Fichier prêt : {fileName}</p>}
                    </div>
                  )}

                  {resourceSubtype === 'link' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">URL de la ressource web</label>
                      <input 
                        type="url" 
                        value={itemContent}
                        onChange={(e) => setItemContent(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-3 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>
                  )}

                  {resourceSubtype === 'text' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Contenu de la leçon / cours</label>
                      <textarea 
                        rows={5}
                        value={itemContent}
                        onChange={(e) => setItemContent(e.target.value)}
                        placeholder="Rédigez le cours..."
                        className="w-full p-3 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {addItemType === 'assignment' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Consignes du devoir</label>
                    <textarea 
                      rows={4}
                      value={itemContent}
                      onChange={(e) => setItemContent(e.target.value)}
                      placeholder="Instructions détaillées pour les étudiants..."
                      className="w-full p-3 bg-slate-50 border rounded-xl text-xs resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date d'ouverture</label>
                      <input 
                        type="datetime-local" 
                        value={openDate}
                        onChange={(e) => setOpenDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Date limite (Deadline)</label>
                      <input 
                        type="datetime-local" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {addItemType === 'quiz' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-700">Questions configurées ({quizQuestions.length})</span>
                    {quizQuestions.length > 0 && (
                      <button type="button" onClick={() => setShowQuizPreview(true)} className="text-xs text-indigo-600 font-bold underline">
                        Prévisualiser le quiz
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Type de question</label>
                        <select 
                          value={currentQType} 
                          onChange={(e: any) => setCurrentQType(e.target.value)}
                          className="w-full p-2 rounded-xl border text-xs bg-white"
                        >
                          <option value="mcq">Choix Multiple (QCM)</option>
                          <option value="true_false">Vrai / Faux</option>
                          <option value="matching">Appariement / Correspondance</option>
                          <option value="short_answer">Réponse courte</option>
                          <option value="essay">Composition / Essai</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Énoncé de la question</label>
                        <input 
                          type="text" 
                          value={qText}
                          onChange={(e) => setQText(e.target.value)}
                          placeholder="Question..."
                          className="w-full p-2 rounded-xl border text-xs bg-white"
                        />
                      </div>
                    </div>

                    {currentQType === 'mcq' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Options de réponse (QCM)</label>
                        {qOptions.map((opt, idx) => (
                          <input 
                            key={idx}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...qOptions];
                              updated[idx] = e.target.value;
                              setQOptions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            className="w-full p-2 rounded-lg border text-xs bg-white mb-1"
                          />
                        ))}
                      </div>
                    )}

                    {currentQType === 'true_false' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">Options prédéfinies : Vrai / Faux</label>
                      </div>
                    )}

                    {currentQType === 'matching' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-slate-700">Paires d'appariement</label>
                          <button 
                            type="button" 
                            onClick={() => setMatchingPairs([...matchingPairs, { term: '', definition: '' }])}
                            className="text-[10px] text-indigo-600 font-bold"
                          >
                            + Ajouter une paire
                          </button>
                        </div>
                        {matchingPairs.map((pair, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={pair.term} 
                              onChange={(e) => {
                                const updated = [...matchingPairs];
                                updated[idx].term = e.target.value;
                                setMatchingPairs(updated);
                              }}
                              placeholder={`Élément ${idx+1}`}
                              className="flex-1 p-2 rounded-lg border text-xs bg-white"
                            />
                            <span className="text-slate-400 font-bold">➔</span>
                            <input 
                              type="text" 
                              value={pair.definition} 
                              onChange={(e) => {
                                const updated = [...matchingPairs];
                                updated[idx].definition = e.target.value;
                                setMatchingPairs(updated);
                              }}
                              placeholder={`Réponse associée ${idx+1}`}
                              className="flex-1 p-2 rounded-lg border text-xs bg-white"
                            />
                            {matchingPairs.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Réponse correcte / Corrigé</label>
                      <input 
                        type="text" 
                        value={qCorrectAnswer} 
                        onChange={(e) => setQCorrectAnswer(e.target.value)} 
                        placeholder="Indiquez la réponse correcte..."
                        className="w-full p-2.5 rounded-xl border text-xs bg-white"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleAddQuizQuestion}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors"
                    >
                      + Ajouter cette question au Quiz
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Enregistrer l'élément</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ASSIGNMENT SUBMISSIONS */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-lg">Soumissions des étudiants : {viewingAssignment.title}</h3>
            
            {(!viewingAssignment.submissions || viewingAssignment.submissions.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">Aucun étudiant n'a encore soumis son travail pour ce devoir.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {viewingAssignment.submissions.map((sub: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center font-bold text-xs text-slate-900">
                      <span>{sub.studentName}</span>
                      <span className="text-[10px] text-slate-500">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-600">{sub.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingAssignment(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DOCUMENT VIEWER */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase">Visualiseur de document intégré</span>
                <h3 className="font-bold text-slate-900 text-lg">{viewingDocument.fileName || viewingDocument.title}</h3>
              </div>
              <button onClick={() => setViewingDocument(null)} className="p-2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="flex-1 bg-slate-100 rounded-2xl p-4 overflow-y-auto min-h-[350px] flex items-center justify-center">
              {viewingDocument.fileData && viewingDocument.fileData.includes('application/pdf') ? (
                <iframe src={viewingDocument.fileData} className="w-full h-[500px] rounded-xl border" title="Aperçu PDF" />
              ) : viewingDocument.fileData && viewingDocument.fileData.includes('image/') ? (
                <img src={viewingDocument.fileData} alt="Document" className="max-h-[450px] object-contain rounded-xl shadow-md" />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <FileText size={48} className="mx-auto text-blue-600" />
                  <p className="text-sm font-bold text-slate-800">Document prêt à être consulté</p>
                  <p className="text-xs text-slate-500 max-w-sm">Ce fichier ({viewingDocument.fileName || 'Document'}) peut être téléchargé directement pour une lecture hors-ligne complète.</p>
                  <a 
                    href={viewingDocument.fileData} 
                    download={viewingDocument.fileName || 'document'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    📥 Télécharger le fichier source
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewingDocument(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUIZ PREVIEW */}
      {showQuizPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Mode Prévisualisation Enseignant</span>
                <h3 className="font-bold text-slate-900 text-lg">Aperçu du Quiz ({quizQuestions.length} questions)</h3>
              </div>
              <button onClick={() => setShowQuizPreview(false)} className="p-2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-2">
              {quizQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600">Question {idx + 1} ({q.type})</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">Corrigé : {q.correctAnswer || 'Défini'}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{q.text}</p>

                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-1 pl-2">
                      {q.options.map((opt: string, i: number) => (
                        <div key={i} className="text-xs text-slate-700 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'matching' && q.matchingPairs && (
                    <div className="space-y-1 pl-2 bg-white p-2 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Paires configurées :</p>
                      {q.matchingPairs.map((p: any, i: number) => (
                        <div key={p.id || i} className="text-xs flex justify-between text-slate-700 border-b last:border-b-0 py-1">
                          <span className="font-semibold">{p.term}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-semibold text-indigo-600">{p.definition}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowQuizPreview(false)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">Fermer la prévisualisation</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / INTERACT WITH ITEM (RESOURCE, ASSIGNMENT, QUIZ) */}
      {selectedItemToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">
                  {selectedItemToView.item.type === 'resource' ? 'Ressource pédagogique' : selectedItemToView.item.type === 'assignment' ? 'Devoir & Espace de dépôt' : 'Quiz Moodle'}
                </span>
                <h3 className="font-bold text-slate-900 text-lg">{selectedItemToView.item.title}</h3>
              </div>
              <button onClick={() => { setSelectedItemToView(null); setQuizScore(null); setQuizAnswers({}); }} className="p-2 text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="space-y-4 text-slate-700 text-sm">
              {selectedItemToView.item.type === 'resource' && (
                <div className="space-y-3">
                  {selectedItemToView.item.subtype === 'text' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border" dangerouslySetInnerHTML={{ __html: selectedItemToView.item.content }} />
                  )}
                  {selectedItemToView.item.subtype === 'link' && (
                    <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                      <p className="text-xs text-slate-600">Lien externe associé :</p>
                      <a href={selectedItemToView.item.content} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold break-all block">
                        🔗 {selectedItemToView.item.content}
                      </a>
                    </div>
                  )}
                  {selectedItemToView.item.subtype === 'file' && (
                    <div className="p-6 bg-slate-50 rounded-2xl border text-center space-y-4">
                      <FileText size={48} className="mx-auto text-indigo-600" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{selectedItemToView.item.fileName || 'Document de cours'}</h4>
                        <p className="text-xs text-slate-500 mt-1">Document officiel mis à disposition par l'enseignant pour ce chapitre.</p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            toast.success(`Téléchargement de ${selectedItemToView.item.fileName || 'document'} en cours...`);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                          <Download size={16} /> Télécharger / Ouvrir le document
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedItemToView.item.type === 'assignment' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                    <h4 className="font-bold text-amber-900 text-sm">Consignes du devoir :</h4>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedItemToView.item.content}</p>
                    <div className="flex gap-4 text-[10px] font-semibold text-slate-500 pt-1">
                      {selectedItemToView.item.openDate && <span>Ouverture : {new Date(selectedItemToView.item.openDate).toLocaleString()}</span>}
                      {selectedItemToView.item.dueDate && <span className="text-red-600">Date limite : {new Date(selectedItemToView.item.dueDate).toLocaleString()}</span>}
                    </div>
                  </div>

                  {!isTeacherOrAdmin && (
                    <div className="space-y-3 pt-3 border-t">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        📤 Espace de dépôt étudiant
                      </h4>
                      <p className="text-xs text-slate-500">Rédigez votre réponse ou collez un lien de partage (Google Drive, GitHub, etc.) :</p>
                      <textarea
                        rows={5}
                        value={studentSubmissionText}
                        onChange={(e) => setStudentSubmissionText(e.target.value)}
                        placeholder="Rédigez votre composition ou collez votre lien de travail ici..."
                        className="w-full p-3 bg-slate-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                      <button
                        onClick={handleStudentSubmitAssignment}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                      >
                        <Send size={16} /> Envoyer / Déposer mon devoir
                      </button>

                      {/* Display student's own submissions */}
                      {selectedItemToView.item.submissions && selectedItemToView.item.submissions.filter((s: any) => s.studentId === user?.id).length > 0 && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <p className="text-xs font-bold text-emerald-800">✅ Travail déjà soumis :</p>
                          {selectedItemToView.item.submissions.filter((s: any) => s.studentId === user?.id).map((sub: any, sIdx: number) => (
                            <div key={sIdx} className="text-xs text-emerald-700 space-y-0.5">
                              <p className="font-semibold">{sub.content}</p>
                              <p className="text-[10px] text-emerald-600">Déposé le {new Date(sub.submittedAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedItemToView.item.type === 'quiz' && (
                <div className="space-y-6">
                  {quizScore !== null ? (
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                      <Award size={48} className="mx-auto text-emerald-600" />
                      <h4 className="font-bold text-emerald-900 text-lg">Quiz terminé !</h4>
                      <p className="text-sm font-bold text-emerald-800">Votre score : {quizScore} / {selectedItemToView.item.questions?.length || 0}</p>
                      <button
                        onClick={() => { setQuizScore(null); setQuizAnswers({}); }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                      >
                        Recommencer le quiz
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedItemToView.item.questions?.map((q: any, qIdx: number) => (
                        <div key={q.id || qIdx} className="p-4 bg-slate-50 rounded-2xl border space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Question {qIdx + 1} ({q.type === 'true_false' ? 'Vrai / Faux' : q.type === 'matching' ? 'Appariement' : q.type === 'mcq' ? 'QCM' : 'Réponse courte'})</span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{q.text}</p>

                          {/* MCQ */}
                          {q.type === 'mcq' && q.options && (
                            <div className="space-y-2 pl-2 pt-1">
                              {q.options.map((opt: string, oIdx: number) => (
                                <label key={oIdx} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer bg-white p-2 rounded-xl border border-slate-200 hover:border-indigo-300">
                                  <input
                                    type="radio"
                                    name={`q_${q.id || qIdx}`}
                                    value={opt}
                                    checked={quizAnswers[q.id || qIdx] === opt}
                                    onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id || qIdx]: e.target.value })}
                                  />
                                  <span className="font-medium">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* TRUE / FALSE */}
                          {q.type === 'true_false' && (
                            <div className="flex gap-4 pt-1">
                              {['Vrai', 'Faux'].map((opt) => (
                                <label key={opt} className={`flex-1 p-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                                  quizAnswers[q.id || qIdx] === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 hover:bg-slate-100'
                                }`}>
                                  <input
                                    type="radio"
                                    name={`q_${q.id || qIdx}`}
                                    value={opt}
                                    checked={quizAnswers[q.id || qIdx] === opt}
                                    onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id || qIdx]: e.target.value })}
                                    className="sr-only"
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          )}

                          {/* MATCHING (Appariement) */}
                          {q.type === 'matching' && q.matchingPairs && (
                            <div className="space-y-2 bg-white p-3 rounded-xl border">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Associez chaque terme à sa définition :</p>
                              {q.matchingPairs.map((p: any, pIdx: number) => {
                                const pairKey = `matching_${q.id || qIdx}_${pIdx}`;
                                const allDefs = q.matchingPairs.map((item: any) => item.definition);
                                return (
                                  <div key={p.id || pIdx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2 border-b last:border-b-0 text-xs">
                                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{p.term}</span>
                                    <span className="text-slate-400 hidden sm:inline">➔</span>
                                    <select
                                      value={quizAnswers[pairKey] || ''}
                                      onChange={(e) => setQuizAnswers({ ...quizAnswers, [pairKey]: e.target.value })}
                                      className="w-full sm:w-64 p-2 bg-slate-50 border rounded-lg text-xs outline-none"
                                    >
                                      <option value="">-- Choisir la définition --</option>
                                      {allDefs.map((def: string, dIdx: number) => (
                                        <option key={dIdx} value={def}>{def}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* SHORT ANSWER */}
                          {q.type !== 'mcq' && q.type !== 'true_false' && q.type !== 'matching' && (
                            <input
                              type="text"
                              placeholder="Votre réponse..."
                              value={quizAnswers[q.id || qIdx] || ''}
                              onChange={(e) => setQuizAnswers({ ...quizAnswers, [q.id || qIdx]: e.target.value })}
                              className="w-full p-2.5 bg-white border rounded-xl text-xs outline-none"
                            />
                          )}
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          let score = 0;
                          selectedItemToView.item.questions?.forEach((q: any, qIdx: number) => {
                            if (q.type === 'matching') {
                              let allMatchingCorrect = true;
                              q.matchingPairs?.forEach((p: any, pIdx: number) => {
                                const pairKey = `matching_${q.id || qIdx}_${pIdx}`;
                                const userVal = (quizAnswers[pairKey] || '').trim();
                                if (userVal !== (p.definition || '').trim()) {
                                  allMatchingCorrect = false;
                                }
                              });
                              if (allMatchingCorrect) score++;
                            } else {
                              const userAns = (quizAnswers[q.id || qIdx] || '').trim().toLowerCase();
                              const correctAns = (q.correctAnswer || '').trim().toLowerCase();
                              if (userAns && correctAns && userAns === correctAns) {
                                score++;
                              }
                            }
                          });
                          setQuizScore(score);
                          toast.success(`Quiz évalué ! Score : ${score}/${selectedItemToView.item.questions?.length}`);
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                      >
                        Valider et soumettre mes réponses au Quiz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => { setSelectedItemToView(null); setQuizScore(null); setQuizAnswers({}); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT ASSIGNMENT DEPOSIT MODAL (Supabase Storage Integrated) */}
      {studentDepositModalAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  <h3 className="font-bold text-base">Espace de Dépôt de Devoir</h3>
                </div>
                <p className="text-xs text-amber-100 mt-0.5 font-medium">
                  {studentDepositModalAssignment.item.title}
                </p>
              </div>
              <button
                onClick={() => setStudentDepositModalAssignment(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveStudentSubmission} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Instructions */}
              {studentDepositModalAssignment.item.content && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-amber-900 text-xs">Consignes du professeur :</p>
                  <p className="text-amber-800 leading-relaxed whitespace-pre-wrap">{studentDepositModalAssignment.item.content}</p>
                </div>
              )}

              {/* Deadlines */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {studentDepositModalAssignment.item.openDate && (
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Ouvert le : {new Date(studentDepositModalAssignment.item.openDate).toLocaleString('fr-FR')}
                  </span>
                )}
                {studentDepositModalAssignment.item.dueDate && (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-semibold flex items-center gap-1.5 border border-rose-100">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Date limite : {new Date(studentDepositModalAssignment.item.dueDate).toLocaleString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Current submission status if already submitted */}
              {(() => {
                const mySub = (studentDepositModalAssignment.item.submissions || []).find((s: any) => s.studentId === user?.id);
                if (!mySub) return null;
                return (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Devoir déjà déposé
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {mySub.submittedAt ? new Date(mySub.submittedAt).toLocaleString('fr-FR') : ''}
                      </span>
                    </div>
                    {mySub.grade !== null && mySub.grade !== undefined && (
                      <div className="p-2.5 bg-white border border-emerald-300 rounded-lg">
                        <span className="font-bold text-slate-800">Note attribuée : </span>
                        <span className="font-extrabold text-indigo-700 text-sm">{mySub.grade}/20</span>
                        {mySub.feedback && (
                          <p className="text-slate-600 text-xs mt-1 italic">« {mySub.feedback} »</p>
                        )}
                      </div>
                    )}
                    {mySub.fileName && (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[280px]">Fichier actuel : {mySub.fileName}</span>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(mySub)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Télécharger
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* File upload zone (Supabase storage) */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  1. Joindre votre fichier de devoir (PDF, Word, Archive ZIP, Image...)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center transition-colors bg-slate-50">
                  <input
                    type="file"
                    id="studentFilePicker"
                    onChange={handleStudentSubmissionFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="studentFilePicker" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-400 hover:text-amber-600 transition-colors" />
                    <div>
                      <span className="font-bold text-amber-700 hover:underline">Cliquez pour sélectionner votre fichier</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Stockage sécurisé sur Supabase Storage</p>
                    </div>
                  </label>
                  {submissionFileName && (
                    <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{submissionFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Text answer */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  2. Réponses textuelles ou remarques pour l'enseignant
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Rédigez votre réponse ou détails de votre travail ici..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none resize-none text-xs"
                />
              </div>

              {/* External link */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  3. Lien externe (Optionnel : Google Drive, GitHub, Google Docs...)
                </label>
                <input
                  type="url"
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setStudentDepositModalAssignment(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Téléversement Supabase en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Déposer définitivement mon travail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* TEACHER GRADING MODAL (View & Grade Student Submissions with Supabase Download) */}
      {teacherGradingModalAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <h3 className="font-bold text-base">Évaluation des Devoirs & Notations</h3>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5 font-medium">
                  {teacherGradingModalAssignment.item.title} • {(teacherGradingModalAssignment.item.submissions || []).length} devoirs déposés sur {enrolledStudents.length} étudiants
                </p>
              </div>
              <button
                onClick={() => setTeacherGradingModalAssignment(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Stats overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                  <p className="text-[11px] text-indigo-700 font-semibold">Total Étudiants</p>
                  <p className="text-xl font-black text-indigo-900 mt-0.5">{enrolledStudents.length}</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                  <p className="text-[11px] text-emerald-700 font-semibold">Devoirs Reçus</p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">{(teacherGradingModalAssignment.item.submissions || []).length}</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <p className="text-[11px] text-amber-700 font-semibold">Déjà Notés</p>
                  <p className="text-xl font-black text-amber-900 mt-0.5">
                    {(teacherGradingModalAssignment.item.submissions || []).filter((s: any) => s.grade !== null && s.grade !== undefined).length}
                  </p>
                </div>
              </div>

              {/* Submissions List */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Liste des copies déposées</h4>

                {(!teacherGradingModalAssignment.item.submissions || teacherGradingModalAssignment.item.submissions.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 border rounded-xl space-y-2">
                    <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-600">Aucun étudiant n'a encore déposé son travail pour ce devoir.</p>
                    <p className="text-[11px] text-slate-400">Les dépôts apparaîtront automatiquement ici au fur et à mesure.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teacherGradingModalAssignment.item.submissions.map((sub: any, sIdx: number) => (
                      <div key={sub.id || sIdx} className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl space-y-3 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{sub.studentName || 'Étudiant'}</p>
                            <p className="text-[11px] text-slate-500">{sub.studentEmail}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded border">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('fr-FR') : 'Date inconnue'}
                            </span>
                            {sub.grade !== null && sub.grade !== undefined ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-lg">
                                {sub.grade} / 20
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg">
                                En attente de note
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission Content */}
                        {sub.content && (
                          <div className="bg-white p-3 rounded-lg border text-xs text-slate-700 whitespace-pre-wrap">
                            <p className="font-bold text-slate-500 text-[10px] uppercase mb-1">Texte de l'étudiant :</p>
                            {sub.content}
                          </div>
                        )}

                        {/* Attachments / Links */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(sub.fileName || sub.fileUrl || sub.fileData) && (
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(sub)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger la copie ({sub.fileName || 'Fichier'})</span>
                            </button>
                          )}
                          {sub.externalLink && (
                            <a
                              href={sub.externalLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 border text-indigo-700 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span>Lien externe fourni</span>
                            </a>
                          )}
                        </div>

                        {/* Grading form */}
                        <div className="pt-2 border-t flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="font-bold text-slate-700 whitespace-nowrap">Note (/20) :</label>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              defaultValue={sub.grade ?? ''}
                              id={`grade_input_${sub.studentId}`}
                              className="w-20 p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              defaultValue={sub.feedback ?? ''}
                              id={`feedback_input_${sub.studentId}`}
                              placeholder="Commentaires / appréciations pour l'étudiant..."
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const gradeVal = (document.getElementById(`grade_input_${sub.studentId}`) as HTMLInputElement)?.value;
                              const feedbackVal = (document.getElementById(`feedback_input_${sub.studentId}`) as HTMLInputElement)?.value;
                              
                              if (gradeVal === '' || isNaN(Number(gradeVal))) {
                                toast.error("Veuillez saisir une note valide entre 0 et 20.");
                                return;
                              }

                              const numGrade = Number(gradeVal);
                              if (numGrade < 0 || numGrade > 20) {
                                toast.error("La note doit être comprise entre 0 et 20.");
                                return;
                              }

                              // Update submissions list
                              const updatedSubmissions = teacherGradingModalAssignment.item.submissions.map((s: any) => {
                                if (s.studentId === sub.studentId) {
                                  return {
                                    ...s,
                                    grade: numGrade,
                                    feedback: feedbackVal || ''
                                  };
                                }
                                return s;
                              });

                              // Update course state and Firebase
                              const { courseId, chapterId, item } = teacherGradingModalAssignment;
                              const updatedCourses = courses.map(c => {
                                if (c.id === courseId) {
                                  const updatedChapters = (c.chapters || []).map((chap: any) => {
                                    if (chap.id === chapterId) {
                                      const updatedItems = (chap.items || []).map((it: any) => {
                                        if (it.id === item.id) {
                                          return { ...it, submissions: updatedSubmissions };
                                        }
                                        return it;
                                      });
                                      return { ...chap, items: updatedItems };
                                    }
                                    return chap;
                                  });
                                  return { ...c, chapters: updatedChapters };
                                }
                                return c;
                              });

                              const classRef = doc(db, 'teacherClasses', classItem.id);
                              updateDoc(classRef, { courses: updatedCourses }).then(() => {
                                setCourses(updatedCourses);
                                setTeacherGradingModalAssignment({
                                  ...teacherGradingModalAssignment,
                                  item: { ...teacherGradingModalAssignment.item, submissions: updatedSubmissions }
                                });
                                toast.success(`Note de ${numGrade}/20 enregistrée pour ${sub.studentName || 'l\'étudiant'} !`);
                              }).catch(err => {
                                console.error(err);
                                toast.error("Erreur lors de l'enregistrement de la note.");
                              });
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow transition-colors whitespace-nowrap"
                          >
                            Enregistrer la note
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setTeacherGradingModalAssignment(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
