import { useState } from 'react';
import useUserContext from './useUserContext';
import { GameInstance } from '../types';

/**
 * Custom hook to manage the state and logic for the "Nim" game page,
 * including making a move and handling input changes.
 * @param gameState The current state of the Nim game.
 * @returns An object containing the following:
 * - `user`: The current user from the context.
 * - `move`: The current move entered by the player.
 * - `handleMakeMove`: A function to send the player's move to the server via a socket event.
 * - `handleInputChange`: A function to update the move state based on user input (1 to 3 objects).
 */

const useNimGamePage = (gameState: GameInstance) => {
  const { user, socket } = useUserContext();

  // TODO: Task 2 - Define the state variable to store the current move (`move`)
  const [move, setMove] = useState<number | null>(null); // use null to explicitly represent no move

  const handleMakeMove = async () => {
    // TODO: Task 2 - Emit a socket event to make a move in the Nim game
    if (move !== null) {
      socket.emit('makeMove', {
        gameID: gameState.gameID,
        move: {
          gameID: gameState.gameID,
          playerID: user.username,
          move: {
            numObjects: move,
          },
        },
      });
      setMove(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Task 2 - Update the move state based on the user input.
    // The move should be a number between 1 and 3, and apply this validation before
    // updating the state.

    const { value } = e.target;
    const numValue = parseInt(value, 10);
    if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 3) {
      setMove(numValue);
    } else if (value === '') {
      setMove(null);
    }
  };

  return {
    user,
    move,
    handleMakeMove,
    handleInputChange,
  };
};

export default useNimGamePage;
