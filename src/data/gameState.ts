export interface GameInfo {
    gameUrl: string;
    permissionList: GamePermission[];
  }
  

export interface GamePermission {
    identity: string;
    permissions: string[];
  }

  export interface GameStateContent {
    // Game State Management
    currentState: 'GameStartState' | 'WaitingState' | 'GuessState' | 'RightState' | 'WrongState' | 'NextLevelState' | 'GameOverState' | 'ResetGameState';

    // Game Configuration
    gameMode: 'single' | 'multiplayer';
    difficulty: 'easy' | 'medium' | 'hard';
  
    // Game Object Details
    mainPicture: {
      key: string;
      scale: number;
      position: { x: number; y: number };
    };
  
    // Shadow-related Details
    shadows: {
      texture: string;
      position: { x: number; y: number };
      isCorrect: boolean;
      isHovered: boolean;
      isSelected: boolean;
    }[];
  
    // Game Progress Tracking
    correctShadow: string;
    guessedShadow: string | null;
    playerWrongCount: number;
    playerMaxWrong: number;
  
    // Timer Management
    timeRemaining: number;
    totalTime: number;
    timerStatus: 'running' | 'paused' | 'stopped';
  
    // Game Level Management
    currentLevel: number;
  
    // Player Information
    currentPlayer: {
      id: string | undefined;
      mousePosition: { x: number; y: number };
    };
  
    // Multiplayer Specific
    connectedPlayers: string[];
}

export interface UserInformation {
  sub: string | null;
  email_verified: boolean;
  name: string | null;
  preferred_username: string | null;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
}