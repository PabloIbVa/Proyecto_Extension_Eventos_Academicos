import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResult, ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResult> {
    return this.chatService.sendMessage(dto);
  }
}
