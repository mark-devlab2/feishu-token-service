import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers['x-api-key'];
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('invalid api key');
    }

    return true;
  }
}
