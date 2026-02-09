import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto): Promise<{ accessToken: string; user: Partial<User> }> {
        const existingUser = await this.userRepository.findOne({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = this.userRepository.create({
            email: dto.email,
            passwordHash,
            balance: '1000.00', // Initial balance for testing
        });

        await this.userRepository.save(user);

        const accessToken = this.generateToken(user);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                balance: user.balance,
            },
        };
    }

    async login(dto: LoginDto): Promise<{ accessToken: string; user: Partial<User> }> {
        const user = await this.userRepository.findOne({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = this.generateToken(user);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                balance: user.balance,
            },
        };
    }

    private generateToken(user: User): string {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload);
    }

    async validateUserById(userId: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }
}
