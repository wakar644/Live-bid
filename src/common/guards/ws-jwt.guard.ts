import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private authService: AuthService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient<Socket>();
        const token = this.extractTokenFromHandshake(client);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('jwt.secret'),
            });

            const user = await this.authService.validateUserById(payload.sub);

            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            // Attach user to socket data
            client.data.user = user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    private extractTokenFromHandshake(client: Socket): string | undefined {
        const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;

        if (typeof auth === 'string') {
            if (auth.startsWith('Bearer ')) {
                return auth.substring(7);
            }
            return auth;
        }

        return undefined;
    }
}
