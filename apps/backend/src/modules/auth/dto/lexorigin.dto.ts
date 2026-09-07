import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

/**
 * A signed handoff assertion minted by LexOrigin for one of its business
 * owners, exchanged here for a normal Jasper session.
 */
export class LexOriginHandoffDto {
  @ApiProperty({
    description:
      'Short-lived JWT issued by LexOrigin identifying the business owner. Signed with the shared bridge secret; valid for a couple of minutes.',
  })
  @IsJWT()
  @IsNotEmpty()
  assertion: string;
}
