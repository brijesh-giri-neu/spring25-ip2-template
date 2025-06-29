import mongoose from 'mongoose';
import supertest from 'supertest';
import { app } from '../../app';
import * as chatService from '../../services/chat.service';
import chatController from '../../controllers/chat.controller';
import * as databaseUtil from '../../utils/database.util';
import { Chat } from '../../types/chat';
import { Message } from '../../types/message';

/**
 * Spies on the service functions
 */
const saveChatSpy = jest.spyOn(chatService, 'saveChat');
const createMessageSpy = jest.spyOn(chatService, 'createMessage');
const addMessageSpy = jest.spyOn(chatService, 'addMessageToChat');
const getChatSpy = jest.spyOn(chatService, 'getChat');
const addParticipantSpy = jest.spyOn(chatService, 'addParticipantToChat');
const populateDocumentSpy = jest.spyOn(databaseUtil, 'populateDocument');
const getChatsByParticipantsSpy = jest.spyOn(chatService, 'getChatsByParticipants');
// eslint-disable-next-line @typescript-eslint/no-var-requires

/**
 * Sample test suite for the /chat endpoints
 */
describe('Chat Controller', () => {
  describe('POST /chat/createChat', () => {
    // TODO: Task 3 Write additional tests for the createChat endpoint
    it('should create a new chat successfully', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };

      const serializedPayload = {
        ...validChatPayload,
        messages: validChatPayload.messages.map(message => ({
          ...message,
          msgDateTime: message.msgDateTime.toISOString(),
        })),
      };

      const chatResponse: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post('/chat/createChat').send(validChatPayload);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: chatResponse._id?.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id?.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user?._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt?.toISOString(),
        updatedAt: chatResponse.updatedAt?.toISOString(),
      });

      expect(saveChatSpy).toHaveBeenCalledWith(serializedPayload);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id?.toString(), 'chat');
    });

    it('should return 400 for an invalid payload', async () => {
      const response = await supertest(app).post('/chat/createChat').send({ messages: [] }); // Missing participants
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request body');
    });

    it('should return 500 if saveChat fails', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };
      saveChatSpy.mockResolvedValue({ error: 'DB error' });
      const response = await supertest(app).post('/chat/createChat').send(validChatPayload);
      expect(response.status).toBe(500);
      expect(response.text).toBe('DB error');
    });

    it('should return 500 if populateDocument fails', async () => {
      const validChatPayload = {
        participants: ['user1', 'user2'],
        messages: [{ msg: 'Hello!', msgFrom: 'user1', msgDateTime: new Date('2025-01-01') }],
      };
      const chatResponse: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveChatSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue({ error: 'Population failed' });
      const response = await supertest(app).post('/chat/createChat').send(validChatPayload);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Population failed');
    });
  });

  describe('POST /chat/:chatId/addMessage', () => {
    // TODO: Task 3 Write additional tests for the addMessage endpoint
    it('should add a message to chat successfully', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload: Message = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };

      const serializedPayload = {
        ...messagePayload,
        msgDateTime: messagePayload.msgDateTime.toISOString(),
      };

      const messageResponse = {
        _id: new mongoose.Types.ObjectId(),
        ...messagePayload,
        user: {
          _id: new mongoose.Types.ObjectId(),
          username: 'user1',
        },
      };

      const chatResponse = {
        _id: chatId,
        participants: ['user1', 'user2'],
        messages: [messageResponse],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      createMessageSpy.mockResolvedValue(messageResponse);
      addMessageSpy.mockResolvedValue(chatResponse);
      populateDocumentSpy.mockResolvedValue(chatResponse);

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        _id: chatResponse._id.toString(),
        participants: chatResponse.participants.map(participant => participant.toString()),
        messages: chatResponse.messages.map(message => ({
          ...message,
          _id: message._id.toString(),
          msgDateTime: message.msgDateTime.toISOString(),
          user: {
            ...message.user,
            _id: message.user._id.toString(),
          },
        })),
        createdAt: chatResponse.createdAt.toISOString(),
        updatedAt: chatResponse.updatedAt.toISOString(),
      });

      expect(createMessageSpy).toHaveBeenCalledWith(serializedPayload);
      expect(addMessageSpy).toHaveBeenCalledWith(chatId.toString(), messageResponse._id.toString());
      expect(populateDocumentSpy).toHaveBeenCalledWith(chatResponse._id.toString(), 'chat');
    });

    it('should return 400 for an invalid message payload', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const response = await supertest(app)
        .post(`/chat/${chatId}/addMessage`)
        .send({ msgFrom: 'user1' }); // Missing msg
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request body');
    });

    it('should return 500 if createMessage fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };
      createMessageSpy.mockResolvedValue({ error: 'Create message failed' });
      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Create message failed');
    });

    it('should return 500 if addMessageToChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload = {
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01'),
        type: 'direct',
      };
      const messageResponse = { _id: new mongoose.Types.ObjectId(), ...messagePayload };
      createMessageSpy.mockResolvedValue(messageResponse as Message);
      addMessageSpy.mockResolvedValue({ error: 'Add message failed' });
      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Add message failed');
    });

    it('should return 500 if populateDocument fails', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messagePayload = {
        msg: 'test',
        msgFrom: 'user',
        msgDateTime: new Date(),
        type: 'direct' as const,
      };
      const messageResponse = { _id: new mongoose.Types.ObjectId(), ...messagePayload };
      const chatResponse = {
        _id: chatId,
        participants: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      createMessageSpy.mockResolvedValue(messageResponse as Message);
      addMessageSpy.mockResolvedValue(chatResponse as Chat);
      populateDocumentSpy.mockResolvedValue({ error: 'Population failed' });

      const response = await supertest(app).post(`/chat/${chatId}/addMessage`).send(messagePayload);

      expect(response.status).toBe(500);
      expect(response.text).toBe('Population failed');
    });
  });

  describe('GET /chat/:chatId', () => {
    // TODO: Task 3 Write additional tests for the getChat endpoint
    it('should retrieve a chat by ID', async () => {
      // 1) Prepare a valid chatId param
      const chatId = new mongoose.Types.ObjectId().toString();

      // 2) Mock a fully enriched chat
      const mockFoundChat: Chat = {
        _id: new mongoose.Types.ObjectId(chatId),
        participants: ['user1'],
        messages: [
          {
            _id: new mongoose.Types.ObjectId(),
            msg: 'Hello!',
            msgFrom: 'user1',
            msgDateTime: new Date('2025-01-01T00:00:00Z'),
            user: {
              _id: new mongoose.Types.ObjectId(),
              username: 'user1',
            },
            type: 'direct',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3) Mock the service calls
      getChatSpy.mockResolvedValue(mockFoundChat);
      populateDocumentSpy.mockResolvedValue(mockFoundChat);

      // 4) Invoke the endpoint
      const response = await supertest(app).get(`/chat/${chatId}`);

      // 5) Assertions
      expect(response.status).toBe(200);
      expect(getChatSpy).toHaveBeenCalledWith(chatId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(mockFoundChat._id?.toString(), 'chat');

      // Convert ObjectIds and Dates for comparison
      expect(response.body).toMatchObject({
        _id: mockFoundChat._id?.toString(),
        participants: mockFoundChat.participants.map(p => p.toString()),
        messages: mockFoundChat.messages.map(m => ({
          _id: m._id?.toString(),
          msg: m.msg,
          msgFrom: m.msgFrom,
          msgDateTime: m.msgDateTime.toISOString(),
          user: {
            _id: m.user?._id.toString(),
            username: m.user?.username,
          },
        })),
        createdAt: mockFoundChat.createdAt?.toISOString(),
        updatedAt: mockFoundChat.updatedAt?.toISOString(),
      });
    });

    it('should return 500 if getChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      getChatSpy.mockResolvedValue({ error: 'Chat not found' });
      const response = await supertest(app).get(`/chat/${chatId}`);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Chat not found');
    });

    it('should return 500 if populateDocument fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const chatResponse = {
        _id: new mongoose.Types.ObjectId(chatId),
        participants: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      getChatSpy.mockResolvedValue(chatResponse as Chat);
      populateDocumentSpy.mockResolvedValue({ error: 'Population failed' });
      const response = await supertest(app).get(`/chat/${chatId}`);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Population failed');
    });
  });

  describe('POST /chat/:chatId/addParticipant', () => {
    // TODO: Task 3 Write additional tests for the addParticipant endpoint
    it('should add a participant to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(chatId),
        participants: ['user1', 'user2'],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      addParticipantSpy.mockResolvedValue(updatedChat);
      populateDocumentSpy.mockResolvedValue(updatedChat);

      const response = await supertest(app).post(`/chat/${chatId}/addParticipant`).send({ userId });

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        _id: updatedChat._id?.toString(),
        participants: updatedChat.participants.map(id => id.toString()),
        messages: [],
        createdAt: updatedChat.createdAt?.toISOString(),
        updatedAt: updatedChat.updatedAt?.toISOString(),
      });

      expect(addParticipantSpy).toHaveBeenCalledWith(chatId, userId);
      expect(populateDocumentSpy).toHaveBeenCalledWith(updatedChat._id?.toString(), 'chat');
    });

    it('should return 400 for an invalid payload', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const response = await supertest(app).post(`/chat/${chatId}/addParticipant`).send({}); // Missing userId
      expect(response.status).toBe(400);
      expect(response.text).toBe('Invalid request body');
    });

    it('should return 500 if addParticipantToChat fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();
      addParticipantSpy.mockResolvedValue({ error: 'Failed to add participant' });
      const response = await supertest(app).post(`/chat/${chatId}/addParticipant`).send({ userId });
      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to add participant');
    });

    it('should return 500 if populateDocument fails', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();
      const chatResponse = {
        _id: new mongoose.Types.ObjectId(chatId),
        participants: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addParticipantSpy.mockResolvedValue(chatResponse as Chat);
      populateDocumentSpy.mockResolvedValue({ error: 'Population failed' });

      const response = await supertest(app).post(`/chat/${chatId}/addParticipant`).send({ userId });
      expect(response.status).toBe(500);
      expect(response.text).toBe('Population failed');
    });
  });

  describe('GET /chat/getChatsByUser/:username', () => {
    it('should return 200 with an array of chats', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce(chats[0]);

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([
        {
          _id: chats[0]._id?.toString(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: chats[0].createdAt?.toISOString(),
          updatedAt: chats[0].updatedAt?.toISOString(),
        },
      ]);
    });

    it('should return 500 if populateDocument fails for any chat', async () => {
      const username = 'user1';
      const chats: Chat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      getChatsByParticipantsSpy.mockResolvedValueOnce(chats);
      populateDocumentSpy.mockResolvedValueOnce({ error: 'Service error' });

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).toHaveBeenCalledWith(chats[0]._id?.toString(), 'chat');
      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving chat: Failed populating chats');
    });

    it('should return 200 with an empty array if no chats are found', async () => {
      const username = 'user-with-no-chats';
      getChatsByParticipantsSpy.mockResolvedValueOnce([]);

      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);

      expect(getChatsByParticipantsSpy).toHaveBeenCalledWith([username]);
      expect(populateDocumentSpy).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 if the service throws an error', async () => {
      const username = 'user1';
      getChatsByParticipantsSpy.mockRejectedValue(new Error('Database error'));
      const response = await supertest(app).get(`/chat/getChatsByUser/${username}`);
      expect(response.status).toBe(500);
      expect(response.text).toBe('Database error');
    });
  });

  describe('Socket Events', () => {
    let socket: any;
    let conn: any;

    beforeEach(() => {
      // Mock the connection object
      conn = {
        on: jest.fn(),
        join: jest.fn(),
        leave: jest.fn(),
      };

      // Mock the socket object
      socket = {
        on: jest.fn((event, cb) => {
          if (event === 'connection') {
            cb(conn);
          }
        }),
      };

      // Initialize the controller with the mock socket
      chatController(socket);
    });

    it('should handle joinChat event and join room', () => {
      const chatId = 'room123';
      // Get the handler for 'joinChat'
      const joinChatHandler = conn.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'joinChat',
      )[1];
      joinChatHandler(chatId);
      expect(conn.join).toHaveBeenCalledWith(chatId);
    });

    it('should handle leaveChat event and leave room', () => {
      const chatId = 'room123';
      // Get the handler for 'leaveChat'
      const leaveChatHandler = conn.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'leaveChat',
      )[1];
      leaveChatHandler(chatId);
      expect(conn.leave).toHaveBeenCalledWith(chatId);
    });

    it('should not leave room if chatId is not provided', () => {
      // Get the handler for 'leaveChat'
      const leaveChatHandler = conn.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'leaveChat',
      )[1];
      leaveChatHandler(undefined);
      expect(conn.leave).not.toHaveBeenCalled();
    });
  });
});
