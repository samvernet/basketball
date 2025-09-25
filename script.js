// Configuration MediaPipe
let pose = null;
let camera = null;

// Éléments DOM
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const analysisSection = document.getElementById('analysisSection');
const performanceSection = document.getElementById('performanceSection');
const outputCanvas = document.getElementById('outputCanvas');
const imageName = document.getElementById('imageName');
const loading = document.getElementById('loading');
const positiveList = document.getElementById('positiveList');
const negativeList = document.getElementById('negativeList');
const tipsList = document.getElementById('tipsList');

// Éléments de performance
const precisionValue = document.getElementById('precisionValue');
const progressionValue = document.getElementById('progressionValue');
const successValue = document.getElementById('successValue');
const timeValue = document.getElementById('timeValue');

// Statistiques de performance
let performanceStats = {
    totalShots: 0,
    successfulShots: 0,
    analysisTime: 0,
    previousAccuracy: 0
};

// Initialisation de MediaPipe Pose
async function initializePose() {
    pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });
    
    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    pose.onResults(onPoseResults);
}

// Traitement des résultats MediaPipe
function onPoseResults(results) {
    if (!results.poseLandmarks) {
        showFeedback({ positive: [], negative: ['Aucune posture détectée'], tips: [] });
        return;
    }

    const landmarks = results.poseLandmarks;
    const analysis = analyzeBasketballPosture(landmarks);
    
    // Dessiner les landmarks sur l'image
    drawPoseOnCanvas(results);
    
    // Afficher le feedback
    showFeedback(analysis);
}

// Analyse de la posture de basketball
function analyzeBasketballPosture(landmarks) {
    const analysis = {
        positive: [],
        negative: [],
        tips: []
    };

    // Calculer les angles et positions
    const angles = calculateAngles(landmarks);
    const positions = calculatePositions(landmarks);

    // Analyse de la posture de base
    analyzeFeetPosition(landmarks, analysis);
    analyzeKneeAlignment(landmarks, analysis);
    analyzeHipPosition(landmarks, analysis);
    analyzeShoulderAlignment(landmarks, analysis);
    analyzeArmPosition(landmarks, analysis);
    analyzeElbowAngle(landmarks, analysis);
    analyzeWristPosition(landmarks, analysis);
    analyzeHeadPosition(landmarks, analysis);

    return analysis;
}

// Calcul des angles entre les points clés
function calculateAngles(landmarks) {
    const angles = {};
    
    // Angle du coude (bras de tir)
    const elbowAngle = calculateAngle(
        landmarks[11], landmarks[13], landmarks[15] // épaule, coude, poignet
    );
    angles.elbow = elbowAngle;

    // Angle du genou
    const kneeAngle = calculateAngle(
        landmarks[23], landmarks[25], landmarks[27] // hanche, genou, cheville
    );
    angles.knee = kneeAngle;

    return angles;
}

// Calcul des positions relatives
function calculatePositions(landmarks) {
    const positions = {};
    
    // Position des pieds
    positions.leftFoot = landmarks[31];
    positions.rightFoot = landmarks[32];
    
    // Position des épaules
    positions.leftShoulder = landmarks[11];
    positions.rightShoulder = landmarks[12];
    
    // Position des mains
    positions.leftHand = landmarks[15];
    positions.rightHand = landmarks[16];

    return positions;
}

// Analyse de la position des pieds
function analyzeFeetPosition(landmarks, analysis) {
    const leftFoot = landmarks[31];
    const rightFoot = landmarks[32];
    
    if (!leftFoot || !rightFoot) return;
    
    const footDistance = Math.abs(leftFoot.x - rightFoot.x);
    
    if (footDistance > 0.1 && footDistance < 0.3) {
        analysis.positive.push("Position des pieds stable et équilibrée");
    } else if (footDistance > 0.3) {
        analysis.negative.push("Les pieds sont trop écartés");
        analysis.tips.push("Gardez les pieds à largeur d'épaules pour un meilleur équilibre");
    } else {
        analysis.negative.push("Les pieds sont trop rapprochés");
        analysis.tips.push("Écartez légèrement les pieds pour plus de stabilité");
    }
}

// Analyse de l'alignement des genoux
function analyzeKneeAlignment(landmarks, analysis) {
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    
    if (!leftKnee || !rightKnee) return;
    
    const kneeAlignment = Math.abs(leftKnee.y - rightKnee.y);
    
    if (kneeAlignment < 0.05) {
        analysis.positive.push("Alignement des genoux correct");
    } else {
        analysis.negative.push("Genoux mal alignés");
        analysis.tips.push("Assurez-vous que vos genoux sont à la même hauteur");
    }
}

// Analyse de la position des hanches
function analyzeHipPosition(landmarks, analysis) {
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return;
    
    const hipAlignment = Math.abs(leftHip.y - rightHip.y);
    
    if (hipAlignment < 0.05) {
        analysis.positive.push("Position des hanches équilibrée");
    } else {
        analysis.negative.push("Hanches déséquilibrées");
        analysis.tips.push("Maintenez vos hanches de niveau");
    }
}

// Analyse de l'alignement des épaules
function analyzeShoulderAlignment(landmarks, analysis) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!leftShoulder || !rightShoulder) return;
    
    const shoulderAlignment = Math.abs(leftShoulder.y - rightShoulder.y);
    
    if (shoulderAlignment < 0.05) {
        analysis.positive.push("Épaules bien alignées");
    } else {
        analysis.negative.push("Épaules désalignées");
        analysis.tips.push("Gardez vos épaules de niveau et détendues");
    }
}

// Analyse de la position des bras
function analyzeArmPosition(landmarks, analysis) {
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    
    if (!leftWrist || !rightWrist || !leftElbow || !rightElbow) return;
    
    // Vérifier si un bras est en position de tir
    const leftArmRaised = leftWrist.y < leftElbow.y;
    const rightArmRaised = rightWrist.y < rightElbow.y;
    
    if (leftArmRaised || rightArmRaised) {
        analysis.positive.push("Bras de tir en position");
        
        // Vérifier la position verticale du bras
        const shootingWrist = leftArmRaised ? leftWrist : rightWrist;
        const shootingElbow = leftArmRaised ? leftElbow : rightElbow;
        
        if (shootingWrist.y < shootingElbow.y - 0.1) {
            analysis.positive.push("Bras de tir bien élevé");
        } else {
            analysis.negative.push("Le bras de tir n'est pas assez élevé");
            analysis.tips.push("Élevez davantage votre bras de tir au-dessus de votre tête");
        }
    } else {
        analysis.negative.push("Aucun bras n'est en position de tir");
        analysis.tips.push("Levez votre bras de tir au-dessus de votre tête");
    }
}

// Analyse de l'angle du coude
function analyzeElbowAngle(landmarks, analysis) {
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    
    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist) return;
    
    // Calculer l'angle du coude pour chaque bras
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Vérifier quel bras est en position de tir (le plus élevé)
    const leftArmHeight = leftWrist.y;
    const rightArmHeight = rightWrist.y;
    
    if (leftArmHeight < rightArmHeight) {
        // Bras gauche en position de tir
        if (leftElbowAngle > 80 && leftElbowAngle < 120) {
            analysis.positive.push("Angle du coude optimal pour le tir");
        } else if (leftElbowAngle < 80) {
            analysis.negative.push("Angle du coude trop fermé");
            analysis.tips.push("Ouvrez davantage votre coude pour un meilleur arc de tir");
        } else {
            analysis.negative.push("Angle du coude trop ouvert");
            analysis.tips.push("Fermez légèrement votre coude pour plus de contrôle");
        }
    } else if (rightArmHeight < leftArmHeight) {
        // Bras droit en position de tir
        if (rightElbowAngle > 80 && rightElbowAngle < 120) {
            analysis.positive.push("Angle du coude optimal pour le tir");
        } else if (rightElbowAngle < 80) {
            analysis.negative.push("Angle du coude trop fermé");
            analysis.tips.push("Ouvrez davantage votre coude pour un meilleur arc de tir");
        } else {
            analysis.negative.push("Angle du coude trop ouvert");
            analysis.tips.push("Fermez légèrement votre coude pour plus de contrôle");
        }
    }
}

// Analyse de la position du poignet
function analyzeWristPosition(landmarks, analysis) {
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    
    if (!leftWrist || !rightWrist) return;
    
    // Vérifier si un poignet est en position de tir (plus haut)
    const leftArmHeight = leftWrist.y;
    const rightArmHeight = rightWrist.y;
    
    if (leftArmHeight < rightArmHeight) {
        // Bras gauche en position de tir
        if (leftWrist.x < 0.6 && leftWrist.x > 0.4) {
            analysis.positive.push("Position du poignet centrée");
        } else {
            analysis.negative.push("Poignet décentré");
            analysis.tips.push("Centrez votre poignet par rapport à votre corps");
        }
    } else if (rightArmHeight < leftArmHeight) {
        // Bras droit en position de tir
        if (rightWrist.x < 0.6 && rightWrist.x > 0.4) {
            analysis.positive.push("Position du poignet centrée");
        } else {
            analysis.negative.push("Poignet décentré");
            analysis.tips.push("Centrez votre poignet par rapport à votre corps");
        }
    }
}

// Analyse de la position de la tête
function analyzeHeadPosition(landmarks, analysis) {
    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    
    if (!nose || !leftEye || !rightEye) return;
    
    // Vérifier si la tête est orientée vers le panier
    const eyeAlignment = Math.abs(leftEye.y - rightEye.y);
    
    if (eyeAlignment < 0.05) {
        analysis.positive.push("Tête bien alignée");
    } else {
        analysis.negative.push("Tête inclinée");
        analysis.tips.push("Gardez votre tête droite et regardez vers le panier");
    }
    
    // Vérifier la position verticale de la tête
    if (nose.y < 0.4) {
        analysis.positive.push("Tête en position optimale");
    } else {
        analysis.negative.push("Tête trop basse");
        analysis.tips.push("Relevez légèrement votre menton");
    }
}

// Calcul d'angle entre trois points
function calculateAngle(point1, point2, point3) {
    const vector1 = {
        x: point1.x - point2.x,
        y: point1.y - point2.y
    };
    const vector2 = {
        x: point3.x - point2.x,
        y: point3.y - point2.y
    };
    
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    return angle;
}

// Dessiner la posture sur le canvas
function drawPoseOnCanvas(results) {
    const canvas = outputCanvas;
    const ctx = canvas.getContext('2d');
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.image) {
        // Dessiner l'image
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }
    
    if (results.poseLandmarks) {
        // Dessiner les connexions
        drawConnections(ctx, results.poseLandmarks);
        
        // Dessiner les points
        drawLandmarks(ctx, results.poseLandmarks);
    }
}

// Dessiner les connexions entre les landmarks
function drawConnections(ctx, landmarks) {
    const connections = [
        // Tête et cou
        [0, 1], [1, 2], [2, 3], [3, 7],
        [0, 4], [4, 5], [5, 6], [6, 8],
        
        // Torse
        [9, 10], [11, 12], [11, 13], [12, 14],
        [13, 15], [14, 16],
        
        // Jambes
        [11, 23], [12, 24], [23, 24],
        [23, 25], [24, 26], [25, 27], [26, 28],
        [27, 29], [28, 30], [29, 31], [30, 32]
    ];
    
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    
    connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        if (startPoint && endPoint) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
            ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
            ctx.stroke();
        }
    });
}

// Dessiner les landmarks
function drawLandmarks(ctx, landmarks) {
    ctx.fillStyle = '#FF0000';
    
    landmarks.forEach((landmark, index) => {
        if (landmark) {
            ctx.beginPath();
            ctx.arc(
                landmark.x * ctx.canvas.width,
                landmark.y * ctx.canvas.height,
                3,
                0,
                2 * Math.PI
            );
            ctx.fill();
        }
    });
}

// Afficher le feedback
function showFeedback(analysis) {
    // Effacer les listes précédentes
    positiveList.innerHTML = '';
    negativeList.innerHTML = '';
    tipsList.innerHTML = '';
    
    // Ajouter les points positifs
    analysis.positive.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        positiveList.appendChild(li);
    });
    
    // Ajouter les points négatifs
    analysis.negative.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        negativeList.appendChild(li);
    });
    
    // Ajouter les conseils
    analysis.tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
    });
    
    // Calculer et mettre à jour les statistiques de performance
    updatePerformanceStats(analysis);
    
    // Masquer le loading et afficher les sections
    loading.style.display = 'none';
    performanceSection.style.display = 'block';
    analysisSection.style.display = 'block';
}

// Mettre à jour les statistiques de performance
function updatePerformanceStats(analysis) {
    const startTime = performance.now();
    
    // Simuler une analyse de performance basée sur les résultats
    const positiveScore = analysis.positive.length;
    const negativeScore = analysis.negative.length;
    const totalScore = positiveScore + negativeScore;
    
    // Calculer la précision (pourcentage de points positifs)
    const accuracy = totalScore > 0 ? Math.round((positiveScore / totalScore) * 100) : 0;
    
    // Simuler des statistiques réalistes
    performanceStats.totalShots += 1;
    performanceStats.successfulShots += accuracy > 70 ? 1 : 0;
    performanceStats.analysisTime = Math.round((performance.now() - startTime) / 1000 * 10) / 10;
    
    const currentAccuracy = performanceStats.totalShots > 0 ? 
        Math.round((performanceStats.successfulShots / performanceStats.totalShots) * 100) : 0;
    
    const progression = currentAccuracy - performanceStats.previousAccuracy;
    performanceStats.previousAccuracy = currentAccuracy;
    
    // Mettre à jour l'affichage avec animation
    animateValue(precisionValue, 0, currentAccuracy, 1000, '%');
    animateValue(progressionValue, 0, progression, 1000, '%', true);
    animateValue(successValue, 0, performanceStats.successfulShots, 1000);
    animateValue(timeValue, 0, performanceStats.analysisTime, 1000, 's');
}

// Fonction d'animation pour les valeurs
function animateValue(element, start, end, duration, suffix = '', showSign = false) {
    const startTime = performance.now();
    const isNegative = end < 0;
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Fonction d'easing pour une animation plus fluide
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = start + (end - start) * easeOutQuart;
        
        let displayValue = Math.round(currentValue * 10) / 10;
        
        if (showSign && displayValue > 0) {
            displayValue = '+' + displayValue;
        } else if (displayValue < 0) {
            displayValue = displayValue.toString();
        }
        
        element.textContent = displayValue + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Gestion de l'upload de fichier
fileInput.addEventListener('change', handleFileUpload);

// Gestion du drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Traitement du fichier uploadé
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Traitement du fichier
async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide.');
        return;
    }
    
    // Afficher le nom du fichier
    imageName.textContent = file.name;
    
    // Masquer les sections précédentes et afficher le loading
    analysisSection.style.display = 'none';
    performanceSection.style.display = 'none';
    loading.style.display = 'block';
    
    // Créer un objet Image
    const img = new Image();
    img.onload = async () => {
        // Configurer le canvas
        outputCanvas.width = img.width;
        outputCanvas.height = img.height;
        
        try {
            // Initialiser MediaPipe si ce n'est pas déjà fait
            if (!pose) {
                await initializePose();
            }
            
            // Traiter l'image avec MediaPipe
            await pose.send({ image: img });
        } catch (error) {
            console.error('Erreur lors de l\'analyse:', error);
            showFeedback({
                positive: [],
                negative: ['Erreur lors de l\'analyse de l\'image'],
                tips: ['Veuillez réessayer avec une autre image']
            });
        }
    };
    
    img.src = URL.createObjectURL(file);
}

// Effet parallax pour le ballon de basketball
function initParallaxEffect() {
    const parallaxBall = document.getElementById('parallaxBasketball');
    let scrollSpeed = 0;
    let rotationSpeed = 0;
    
    // Fonction de mise à jour du parallax
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        // Déplacer le ballon selon le scroll
        if (parallaxBall) {
            parallaxBall.style.transform = `translateY(${rate}px) rotate(${scrollSpeed}deg)`;
        }
        
        // Augmenter la vitesse de rotation lors du scroll
        scrollSpeed += 0.5;
        rotationSpeed += 0.1;
        
        requestAnimationFrame(updateParallax);
    }
    
    // Démarrer l'animation
    updateParallax();
    
    // Ajuster la vitesse de rotation selon la vitesse de scroll
    let lastScrollY = 0;
    let scrollVelocity = 0;
    
    window.addEventListener('scroll', () => {
        const currentScrollY = window.pageYOffset;
        scrollVelocity = Math.abs(currentScrollY - lastScrollY);
        lastScrollY = currentScrollY;
        
        // Ajuster l'opacité et la taille selon le scroll
        if (parallaxBall) {
            const opacity = Math.max(0.1, 0.5 - (currentScrollY / 1000));
            const scale = Math.max(0.8, 1.2 - (currentScrollY / 2000));
            
            parallaxBall.style.opacity = opacity;
            parallaxBall.style.fontSize = `${8 * scale}rem`;
            
            // Rotation plus rapide lors du scroll rapide
            if (scrollVelocity > 5) {
                parallaxBall.style.animationDuration = '5s';
            } else {
                parallaxBall.style.animationDuration = '20s';
            }
        }
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializePose();
        console.log('MediaPipe Pose initialisé avec succès');
        
        // Initialiser l'effet parallax
        initParallaxEffect();
        
        // Ajouter des événements aux boutons CTA
        const ctaButtons = document.querySelectorAll('.cta-btn');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (button.classList.contains('primary')) {
                    // Scroll vers la section upload
                    document.querySelector('.upload-section').scrollIntoView({
                        behavior: 'smooth'
                    });
                } else if (button.classList.contains('secondary')) {
                    // Simuler contact expert
                    alert('Contactez-nous à contact@basketstats.com pour une consultation personnalisée !');
                }
            });
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de MediaPipe:', error);
    }
});
